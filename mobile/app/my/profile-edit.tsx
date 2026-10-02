import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { getProfile,nicknameNextChangeAt,removeProfileAvatar,updateProfile,uploadProfileAvatar } from '../../lib/auth';
import { C } from '../../lib/theme';

const dateLabel=(d:Date)=>`${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`;
const defaultNickname=(user:any)=>user?`FUNY회원${String(user.id||'').replace(/-/g,'').slice(-4).toUpperCase()}`:'';

export default function ProfileEdit(){
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [nickname,setNickname]=useState('');
  const [initialNickname,setInitialNickname]=useState('');
  const [avatar,setAvatar]=useState<string|null>(null);
  const [pickedUri,setPickedUri]=useState<string|null>(null);
  const [pickedMimeType,setPickedMimeType]=useState<string|null>(null);
  const [nextNicknameChange,setNextNicknameChange]=useState<Date|null>(null);

  useEffect(()=>{getProfile().then(({profile,user})=>{
    const value=profile?.nickname||defaultNickname(user);
    setNickname(value);setInitialNickname(value);
    setAvatar(profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null);
    setNextNicknameChange(nicknameNextChangeAt(profile?.nickname_changed_at));
  }).catch(e=>Alert.alert('불러오기 실패',String(e?.message||e))).finally(()=>setLoading(false));},[]);

  const nicknameLocked=!!nextNicknameChange;
  const onNicknameChange=(value:string)=>setNickname(value.replace(/[^가-힣A-Za-z0-9]/g,'').slice(0,12));

  const pickAvatar=async()=>{
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){Alert.alert('사진 권한 필요','프로필 이미지를 변경하려면 사진 접근 권한이 필요해요.');return;}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.85});
    if(result.canceled||!result.assets?.[0])return;
    setPickedUri(result.assets[0].uri);
    setPickedMimeType(result.assets[0].mimeType||'image/jpeg');
    setAvatar(result.assets[0].uri);
  };

  const deleteAvatar=()=>{
    if(!avatar||saving)return;
    Alert.alert('프로필 이미지를 삭제할까요?','기본 프로필 이미지로 변경돼요.',[
      {text:'취소',style:'cancel'},
      {text:'삭제',style:'destructive',onPress:async()=>{
        setSaving(true);
        try{await removeProfileAvatar();setAvatar(null);setPickedUri(null);setPickedMimeType(null);Alert.alert('삭제 완료','프로필 이미지가 삭제되었습니다.');}
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
      if(pickedUri)avatarUrl=await uploadProfileAvatar(pickedUri,pickedMimeType||'image/jpeg');
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
          <TextInput value={nickname} onChangeText={onNicknameChange} editable={!nicknameLocked} maxLength={12} placeholder="2~12자 · 한글/영문/숫자" placeholderTextColor={C.muted2} style={[styles.input,nicknameLocked&&styles.inputLocked]}/>
          <Text style={styles.count}>{nickname.length}/12</Text>
          {!nicknameLocked?<Text style={styles.policy}>한글·영문·숫자 2~12자만 사용할 수 있어요. 공백·특수문자·이모지는 입력되지 않으며, 다른 사용자와 같은 닉네임은 사용할 수 없어요. 변경 후 30일 동안 다시 변경할 수 있어요.</Text>:null}
        </View>

        <Pressable disabled={saving} onPress={save} style={[styles.saveButton,saving&&{opacity:.55}]}><Text style={styles.saveText}>{saving?'저장 중…':'저장하기'}</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},loading:{flex:1,backgroundColor:'#F7F4FC',alignItems:'center',justifyContent:'center'},content:{padding:22,paddingBottom:40},avatarWrap:{width:112,height:112,alignSelf:'center',position:'relative',marginTop:12},avatarTap:{width:112,height:112,borderRadius:56,overflow:'hidden'},avatar:{width:112,height:112,borderRadius:56,backgroundColor:'#eee'},avatarPlaceholder:{width:112,height:112,borderRadius:56,backgroundColor:'#EEE8FA',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DDD3F1'},avatarPlaceholderText:{fontSize:14,fontWeight:'800',color:C.purpleDark},avatarAdd:{position:'absolute',right:-3,bottom:-3,width:30,height:30,borderRadius:15,backgroundColor:'#fff',borderWidth:1.5,borderColor:C.purpleDark,alignItems:'center',justifyContent:'center',zIndex:3},avatarAddText:{fontSize:20,lineHeight:22,fontWeight:'500',color:C.purpleDark},avatarDelete:{position:'absolute',right:-5,top:-5,width:28,height:28,borderRadius:14,backgroundColor:'#fff',borderWidth:1,borderColor:'#E0DAE5',alignItems:'center',justifyContent:'center',shadowColor:'#211A2E',shadowOpacity:.12,shadowRadius:5,shadowOffset:{width:0,height:2},elevation:3},avatarDeleteText:{fontSize:20,lineHeight:22,fontWeight:'500',color:C.textSoft},field:{marginTop:30},labelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8,gap:10},label:{fontSize:13,fontWeight:'900',color:C.text},nicknameAvailable:{flexShrink:1,textAlign:'right',fontSize:10.5,fontWeight:'700',color:C.purpleDark},input:{height:52,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',paddingHorizontal:16,fontSize:15,fontWeight:'700',color:C.text},inputLocked:{backgroundColor:'#F1EEF4',color:C.muted},count:{marginTop:6,textAlign:'right',fontSize:11,color:C.muted},policy:{marginTop:5,fontSize:10.5,lineHeight:17,color:C.muted},saveButton:{marginTop:28,height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},saveText:{fontSize:14,fontWeight:'900',color:'#fff'}
});
