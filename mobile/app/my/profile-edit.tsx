import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MySubHeader from '../../components/MySubHeader';
import { getProfile,nicknameNextChangeAt,removeProfileAvatar,updateProfile,uploadProfileAvatar,uploadProfileAvatarDataUrl } from '../../lib/auth';
import { C } from '../../lib/theme';

const dateLabel=(d:Date)=>`${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`;
const defaultNickname=(user:any)=>user?`FUNY회원${String(user.id||'').replace(/-/g,'').slice(-4).toUpperCase()}`:'';

export default function ProfileEdit(){
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [nickname,setNickname]=useState('');
  const [initialNickname,setInitialNickname]=useState('');
  const [avatar,setAvatar]=useState<string|null>(null);
  const [pickedUri,setPickedUri]=useState<string|null>(null);
  const [pickedMimeType,setPickedMimeType]=useState<string|null>(null);
  const [pickedDataUrl,setPickedDataUrl]=useState<string|null>(null);
  const [cropSource,setCropSource]=useState<string|null>(null);
  const [nextNicknameChange,setNextNicknameChange]=useState<Date|null>(null);

  useEffect(()=>{getProfile().then(({profile,user})=>{
    const value=profile?.nickname||defaultNickname(user);
    setNickname(value);setInitialNickname(value);
    setAvatar(profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null);
    setNextNicknameChange(nicknameNextChangeAt(profile?.nickname_changed_at));
  }).catch(e=>Alert.alert('불러오기 실패',String(e?.message||e))).finally(()=>setLoading(false));},[]);

  const nicknameLocked=!!nextNicknameChange;
  // Keep Hangul Jamo while the iOS IME is composing. Final validation still
  // requires a completed 2-12 character Korean/English/number nickname.
  const onNicknameChange=(value:string)=>setNickname(
    value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣᄀ-ᇿA-Za-z0-9]/g,'')
  );

  const cropperHtml=(src:string)=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#18161d;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;-webkit-user-select:none;user-select:none}
  .top{height:54px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font-size:15px;color:#fff}.wrap{height:calc(100% - 164px);display:grid;place-items:center;background:#18161d}.stage{position:relative;width:300px;height:300px;border-radius:50%;overflow:hidden;background:#232129;touch-action:none;box-shadow:0 0 0 2px rgba(255,255,255,.96),0 10px 30px rgba(0,0,0,.28)}
  .stage img{position:absolute;left:0;top:0;max-width:none;transform-origin:0 0;pointer-events:none;will-change:transform}
  .guide{position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.55);pointer-events:none}
  .bottom{height:110px;padding:10px 18px 14px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;color:#fff;font-size:12.5px;font-weight:700;gap:12px;background:#18161d}.actions{width:min(100%,320px);display:grid;grid-template-columns:1fr 1fr;gap:10px}.actions button{height:46px;border-radius:12px;font-size:14px;font-weight:900}.cancel{border:1px solid #6c6672;background:#2a272f;color:#fff}.save{border:0;background:#8b6cf0;color:#fff;box-shadow:0 5px 16px rgba(128,98,216,.35)}
  </style></head><body><div class="top"><strong>프로필 이미지 조정</strong></div><div class="wrap"><div id="stage" class="stage"><img id="img" src=${JSON.stringify(src)}><div class="guide"></div></div></div><div class="bottom"><div>한 손가락으로 이동 · 두 손가락으로 확대/축소</div><div class="actions"><button id="cancel" class="cancel">취소</button><button id="save" class="save">완료</button></div></div><script>
  (function(){
    var V=300,img=document.getElementById('img'),stage=document.getElementById('stage'),x=0,y=0,scale=1,minScale=1,start=null,pinch=null;
    function clamp(){var w=img.naturalWidth*scale,h=img.naturalHeight*scale;x=Math.min(0,Math.max(V-w,x));y=Math.min(0,Math.max(V-h,y));}
    function draw(){clamp();img.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';}
    img.onload=function(){minScale=Math.max(V/img.naturalWidth,V/img.naturalHeight);scale=minScale;x=(V-img.naturalWidth*scale)/2;y=(V-img.naturalHeight*scale)/2;draw();};
    function dist(a,b){var dx=a.clientX-b.clientX,dy=a.clientY-b.clientY;return Math.sqrt(dx*dx+dy*dy)}
    stage.addEventListener('touchstart',function(e){e.preventDefault();if(e.touches.length===1){start={px:e.touches[0].clientX,py:e.touches[0].clientY,x:x,y:y}}else if(e.touches.length===2){var d=dist(e.touches[0],e.touches[1]);pinch={d:d,scale:scale,cx:(e.touches[0].clientX+e.touches[1].clientX)/2-stage.getBoundingClientRect().left,cy:(e.touches[0].clientY+e.touches[1].clientY)/2-stage.getBoundingClientRect().top,x:x,y:y}}},{passive:false});
    stage.addEventListener('touchmove',function(e){e.preventDefault();if(e.touches.length===1&&start){x=start.x+(e.touches[0].clientX-start.px);y=start.y+(e.touches[0].clientY-start.py);draw()}else if(e.touches.length===2&&pinch){var ns=Math.max(minScale,Math.min(minScale*5,pinch.scale*(dist(e.touches[0],e.touches[1])/Math.max(1,pinch.d))));var ratio=ns/pinch.scale;x=pinch.cx-(pinch.cx-pinch.x)*ratio;y=pinch.cy-(pinch.cy-pinch.y)*ratio;scale=ns;draw()}},{passive:false});
    stage.addEventListener('touchend',function(e){if(e.touches.length===0){start=null;pinch=null}else if(e.touches.length===1){start={px:e.touches[0].clientX,py:e.touches[0].clientY,x:x,y:y};pinch=null}});
    document.getElementById('cancel').onclick=function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'cancel'}))};
    document.getElementById('save').onclick=function(){var out=document.createElement('canvas'),S=800,r=S/V;out.width=S;out.height=S;var c=out.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,S,S);c.drawImage(img,x*r,y*r,img.naturalWidth*scale*r,img.naturalHeight*scale*r);window.ReactNativeWebView.postMessage(JSON.stringify({type:'save',data:out.toDataURL('image/jpeg',.88)}))};
  })();
  </script></body></html>`;

  const pickAvatar=async()=>{
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){Alert.alert('사진 권한 필요','프로필 이미지를 변경하려면 사진 접근 권한이 필요해요.');return;}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:.85,base64:true});
    if(result.canceled||!result.assets?.[0])return;
    const asset=result.assets[0];
    if(asset.base64){
      setCropSource(`data:${asset.mimeType||'image/jpeg'};base64,${asset.base64}`);
      return;
    }
    setPickedUri(asset.uri);setPickedMimeType(asset.mimeType||'image/jpeg');setPickedDataUrl(null);setAvatar(asset.uri);
  };

  const deleteAvatar=()=>{
    if(!avatar||saving)return;
    Alert.alert('프로필 이미지를 삭제할까요?','기본 프로필 이미지로 변경돼요.',[
      {text:'취소',style:'cancel'},
      {text:'삭제',style:'destructive',onPress:async()=>{
        setSaving(true);
        try{await removeProfileAvatar();setAvatar(null);setPickedUri(null);setPickedMimeType(null);setPickedDataUrl(null);setCropSource(null);Alert.alert('삭제 완료','프로필 이미지가 삭제되었습니다.');}
        catch(e:any){Alert.alert('삭제 실패',String(e?.message||e));}
        finally{setSaving(false);}
      }}
    ]);
  };

  const save=async()=>{
    const next=nickname.trim();
    if(!next){Alert.alert('닉네임을 입력해주세요.');return;}
    if(nicknameLocked&&next!==initialNickname){Alert.alert('아직 닉네임을 변경할 수 없어요',`${dateLabel(nextNicknameChange!)}부터 다시 변경할 수 있어요.`);return;}
    setSaving(true);
    try{
      let avatarUrl=avatar;
      if(pickedDataUrl)avatarUrl=await uploadProfileAvatarDataUrl(pickedDataUrl);else if(pickedUri)avatarUrl=await uploadProfileAvatar(pickedUri,pickedMimeType||'image/jpeg');
      const profile=await updateProfile({nickname:next,avatar_url:avatarUrl||null});
      setNextNicknameChange(nicknameNextChangeAt(profile?.nickname_changed_at));
      Alert.alert('저장 완료','프로필이 변경되었습니다.',[{text:'확인',onPress:()=>router.replace({pathname:'/account',params:{refresh:String(Date.now())}})}]);
    }catch(e:any){Alert.alert('저장 실패',String(e?.message||e));}
    finally{setSaving(false);}
  };

  if(loading)return <View style={styles.loading}><ActivityIndicator color={C.purple}/></View>;
  return <View style={styles.root}>
    <MySubHeader title="프로필 편집"/>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <Pressable onPress={pickAvatar} style={styles.avatarTap}>
            {avatar?<Image source={{uri:avatar}} style={styles.avatar}/>:<View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>사진</Text></View>}
          </Pressable>
          {avatar?<Pressable onPress={deleteAvatar} disabled={saving} hitSlop={8} style={styles.avatarDelete}><Text style={styles.avatarDeleteText}>×</Text></Pressable>:<Pressable onPress={pickAvatar} hitSlop={8} style={styles.avatarAdd}><Text style={styles.avatarAddText}>＋</Text></Pressable>}
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}><Text style={styles.label}>닉네임</Text>{nicknameLocked?<Text style={styles.nicknameAvailable}>{dateLabel(nextNicknameChange!)}부터 닉네임 변경 가능</Text>:null}</View>
          <TextInput value={nickname} onChangeText={onNicknameChange} editable={!nicknameLocked} placeholder="2~12자 · 한글/영문/숫자" placeholderTextColor={C.muted2} style={[styles.input,nicknameLocked&&styles.inputLocked]}/>
          <Text style={styles.count}>{nickname.length}/12</Text>
          {!nicknameLocked?<Text style={styles.policy}>한글·영문·숫자 2~12자만 사용할 수 있어요. 공백·특수문자·이모지는 입력되지 않으며, 다른 사용자와 같은 닉네임은 사용할 수 없어요. 변경 후 30일 동안 다시 변경할 수 있어요.</Text>:null}
        </View>

        <Pressable disabled={saving} onPress={save} style={[styles.saveButton,saving&&{opacity:.55}]}><Text style={styles.saveText}>{saving?'저장 중…':'저장하기'}</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
      <Modal visible={!!cropSource} animationType="slide" presentationStyle="fullScreen" onRequestClose={()=>setCropSource(null)}>
        <View style={[styles.cropRoot,Platform.OS==='android'&&{paddingBottom:Math.max(insets.bottom,16)}]}>
          {cropSource?<WebView originWhitelist={['*']} source={{html:cropperHtml(cropSource)}} style={styles.cropWeb} scrollEnabled={false} bounces={false} onMessage={e=>{try{const data=JSON.parse(e.nativeEvent.data);if(data.type==='cancel'){setCropSource(null);return;}if(data.type==='save'&&data.data){setPickedDataUrl(String(data.data));setPickedUri(null);setPickedMimeType('image/jpeg');setAvatar(String(data.data));setCropSource(null);}}catch{}}}/>:null}
        </View>
      </Modal>

  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},cropRoot:{flex:1,backgroundColor:'#18161D'},cropWeb:{flex:1,backgroundColor:'#18161D'},loading:{flex:1,backgroundColor:'#F7F4FC',alignItems:'center',justifyContent:'center'},content:{padding:22,paddingBottom:40},avatarWrap:{width:112,height:112,alignSelf:'center',position:'relative',marginTop:12},avatarTap:{width:112,height:112,borderRadius:56,overflow:'hidden'},avatar:{width:112,height:112,borderRadius:56,backgroundColor:'#eee'},avatarPlaceholder:{width:112,height:112,borderRadius:56,backgroundColor:'#EEE8FA',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DDD3F1'},avatarPlaceholderText:{fontSize:14,fontWeight:'800',color:C.purpleDark},avatarAdd:{position:'absolute',right:-3,bottom:-3,width:30,height:30,borderRadius:15,backgroundColor:'#fff',borderWidth:1.5,borderColor:C.purpleDark,alignItems:'center',justifyContent:'center',zIndex:3},avatarAddText:{fontSize:20,lineHeight:22,fontWeight:'500',color:C.purpleDark},avatarDelete:{position:'absolute',right:-5,top:-5,width:28,height:28,borderRadius:14,backgroundColor:'#fff',borderWidth:1,borderColor:'#E0DAE5',alignItems:'center',justifyContent:'center',shadowColor:'#211A2E',shadowOpacity:.12,shadowRadius:5,shadowOffset:{width:0,height:2},elevation:3},avatarDeleteText:{fontSize:20,lineHeight:22,fontWeight:'500',color:C.textSoft},field:{marginTop:30},labelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8,gap:10},label:{fontSize:13,fontWeight:'900',color:C.text},nicknameAvailable:{flexShrink:1,textAlign:'right',fontSize:10.5,fontWeight:'700',color:C.purpleDark},input:{height:52,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',paddingHorizontal:16,fontSize:15,fontWeight:'700',color:C.text},inputLocked:{backgroundColor:'#F1EEF4',color:C.muted},count:{marginTop:6,textAlign:'right',fontSize:11,color:C.muted},policy:{marginTop:5,fontSize:10.5,lineHeight:17,color:C.muted},saveButton:{marginTop:28,height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},saveText:{fontSize:14,fontWeight:'900',color:'#fff'}
});
