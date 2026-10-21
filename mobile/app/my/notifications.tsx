import { useCallback,useEffect,useMemo,useState } from 'react';
import { ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect,useRouter } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { C } from '../../lib/theme';
import { useAppLanguage } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import {
  fetchNotifications,
  FunyNotification,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  openNotificationTarget,
  subscribeNotificationChanges,
} from '../../lib/notifications';

type Filter='all'|'unread';

const categoryIcon=(category:FunyNotification['category'])=>{
  switch(category){
    case 'community':return 'chatbubble-ellipses-outline';
    case 'market':return 'swap-horizontal-outline';
    case 'rewards':return 'trophy-outline';
    case 'missions':return 'checkmark-circle-outline';
    case 'coupons':return 'ticket-outline';
    case 'service':return 'megaphone-outline';
    default:return 'notifications-outline';
  }
};

const timeLabel=(value:string,en:boolean)=>{
  const d=new Date(value),now=new Date(),diff=Math.max(0,now.getTime()-d.getTime());
  const min=Math.floor(diff/60000);
  if(min<1)return en?'Just now':'방금';
  if(min<60)return en?`${min}m ago`:min+'분 전';
  if(min<1440)return en?`${Math.floor(min/60)}h ago`:Math.floor(min/60)+'시간 전';
  return d.toLocaleDateString(en?'en-US':'ko-KR',{month:'numeric',day:'numeric'});
};

const groupKey=(value:string,en:boolean)=>{
  const d=new Date(value),now=new Date();
  return d.toDateString()===now.toDateString()?(en?'Today':'오늘'):(en?'Earlier':'이전');
};

export default function NotificationsScreen(){
  const router=useRouter();
  const {language}=useAppLanguage();
  const en=language==='en';
  const [filter,setFilter]=useState<Filter>('all');
  const [items,setItems]=useState<FunyNotification[]>([]);
  const [loading,setLoading]=useState(true);
  const [userId,setUserId]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    try{
      const {data:{user}}=await supabase.auth.getUser();
      setUserId(user?.id||null);
      if(!user){setItems([]);return;}
      setItems(await fetchNotifications(filter==='unread'));
      await getUnreadNotificationCount(user.id);
    }finally{setLoading(false)}
  },[filter]);

  useFocusEffect(useCallback(()=>{setLoading(true);void refresh();},[refresh]));
  useEffect(()=>{if(!userId)return;return subscribeNotificationChanges(userId,()=>{void refresh()});},[refresh,userId]);

  const unreadCount=useMemo(()=>items.filter(x=>!x.read_at).length,[items]);

  const readAll=async()=>{
    await markAllNotificationsRead();
    setItems(current=>filter==='unread'?[]:current.map(x=>({...x,read_at:x.read_at||new Date().toISOString()})));
  };

  const open=async(item:FunyNotification)=>{
    if(!item.read_at){
      await markNotificationRead(item.id).catch(()=>{});
      setItems(current=>filter==='unread'?current.filter(x=>x.id!==item.id):current.map(x=>x.id===item.id?{...x,read_at:new Date().toISOString()}:x));
      void getUnreadNotificationCount(userId);
    }
    openNotificationTarget(router,{...(item.data||{}),route:item.route,url:item.url});
  };

  let lastGroup='';
  return <View style={styles.root}>
    <MySubHeader
      title={en?'Notifications':'알림'}
      right={unreadCount>0?<Pressable onPress={()=>void readAll()} hitSlop={8} style={styles.readAll}><Text style={styles.readAllText}>{en?'Mark all read':'모두 읽음'}</Text></Pressable>:undefined}
    />
    <View style={styles.filters}>
      <Pressable onPress={()=>setFilter('all')} style={[styles.filter,filter==='all'&&styles.filterOn]}><Text style={[styles.filterText,filter==='all'&&styles.filterTextOn]}>{en?'All':'전체'}</Text></Pressable>
      <Pressable onPress={()=>setFilter('unread')} style={[styles.filter,filter==='unread'&&styles.filterOn]}><Text style={[styles.filterText,filter==='unread'&&styles.filterTextOn]}>{en?'Unread':'미읽음'}</Text></Pressable>
    </View>

    {loading?<View style={styles.loading}><ActivityIndicator color={C.purple}/></View>:
      items.length===0?<View style={styles.empty}><Ionicons name="notifications-outline" size={34} color="#B8B0BD"/><Text style={styles.emptyTitle}>{filter==='unread'?(en?'No new notifications':'새로운 알림이 없어요'):(en?'No notifications yet':'아직 받은 알림이 없어요')}</Text><Text style={styles.emptySub}>{en?'New activity will appear here.':'새 소식이 생기면 이곳에서 알려드릴게요.'}</Text></View>:
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {items.map(item=>{
          const group=groupKey(item.created_at,en);
          const showGroup=group!==lastGroup;
          lastGroup=group;
          return <View key={item.id}>
            {showGroup?<Text style={styles.group}>{group}</Text>:null}
            <Pressable onPress={()=>void open(item)} style={({pressed})=>[styles.card,!item.read_at&&styles.cardUnread,pressed&&styles.cardPressed]}>
              <View style={[styles.iconWrap,!item.read_at&&styles.iconWrapUnread]}><Ionicons name={categoryIcon(item.category) as any} size={19} color={!item.read_at?C.purpleDark:'#736C78'}/></View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text numberOfLines={1} style={[styles.title,!item.read_at&&styles.titleUnread]}>{item.title}</Text>
                  {!item.read_at?<View style={styles.unreadDot}/>:null}
                </View>
                <Text numberOfLines={2} style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{timeLabel(item.created_at,en)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B8B0BD"/>
            </Pressable>
          </View>;
        })}
      </ScrollView>
    }
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  readAll:{height:34,paddingHorizontal:6,alignItems:'center',justifyContent:'center'},
  readAllText:{fontSize:11,fontWeight:'800',color:C.purpleDark},
  filters:{height:52,paddingHorizontal:16,backgroundColor:'#fff',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#F1EDF4',flexDirection:'row',alignItems:'center',gap:8},
  filter:{height:30,paddingHorizontal:14,borderRadius:15,backgroundColor:'#F3F0F5',alignItems:'center',justifyContent:'center'},
  filterOn:{backgroundColor:'#EEE7FA'},
  filterText:{fontSize:11,fontWeight:'800',color:'#8A828E'},
  filterTextOn:{color:C.purpleDark},
  loading:{flex:1,alignItems:'center',justifyContent:'center'},
  empty:{flex:1,alignItems:'center',justifyContent:'center',paddingBottom:80},
  emptyTitle:{marginTop:12,fontSize:14,fontWeight:'900',color:C.text},
  emptySub:{marginTop:6,fontSize:11,color:C.muted},
  content:{paddingHorizontal:16,paddingTop:8,paddingBottom:40},
  group:{marginTop:14,marginBottom:7,paddingHorizontal:3,fontSize:11,fontWeight:'900',color:'#7E7584'},
  card:{minHeight:92,marginBottom:8,paddingHorizontal:13,paddingVertical:13,borderRadius:18,backgroundColor:'#fff',borderWidth:1,borderColor:'#EBE7EE',flexDirection:'row',alignItems:'center'},
  cardUnread:{borderColor:'#E1D6F6',backgroundColor:'#FCFAFF'},
  cardPressed:{opacity:.72},
  iconWrap:{width:38,height:38,borderRadius:13,backgroundColor:'#F1EEF3',alignItems:'center',justifyContent:'center',marginRight:11},
  iconWrapUnread:{backgroundColor:'#EEE7FA'},
  copy:{flex:1,minWidth:0},
  titleRow:{flexDirection:'row',alignItems:'center'},
  title:{flexShrink:1,fontSize:12.5,lineHeight:17,fontWeight:'800',color:'#514B55'},
  titleUnread:{fontWeight:'900',color:C.text},
  unreadDot:{width:6,height:6,borderRadius:3,backgroundColor:C.purpleDark,marginLeft:6},
  body:{marginTop:4,fontSize:11,lineHeight:16,color:'#756E79'},
  time:{marginTop:6,fontSize:9.5,fontWeight:'600',color:'#AAA2AD'},
});
