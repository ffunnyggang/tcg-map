import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { getProfile,nicknameNextChangeAt,removeProfileAvatar,updateProfile,uploadProfileAvatar } from '../../lib/auth';
import { C } from '../../lib/theme';

const dateLabel=(d:Date)=>d.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});

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
    const value=profile?.nickname||user?.user_metadata?.nickname||user?.user_metadata?.name||'';
    setNickname(value);setInitialNickname(value);
    setAvatar(profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null);
    setNextNicknameChange(nicknameNextChangeAt(profile?.nickname_changed_at));
  }).catch(e=>Alert.alert('불러오기 실패',String(e?.message||e))).finally(()=>setLoading(false));},[]);

  const nicknameLocked=!!nextNicknameChange;

  const pickAvatar=async()=>{
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){Alert.alert('사진 권한 필요','프로필 이미지를 변경하려면 사진 접근 권한이 필요합니다.');return;}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.85});
    if(result.canceled||!result.assets?.[0])return;
    setPickedUri(result.assets[0].uri);
    setPickedMimeType(result.assets[0].mimeType||'image/jpeg');
    setAvatar(result.assets[0].uri);
  };

  const deleteAvatar=()=>{
    if(!avatar||saving)return;
    Alert.alert('프로필 이미지를 삭제할까요?','기본 프로필 이미지로 변경됩니다.',[
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
    if(nicknameLocked&&next!==initialNickname){Alert.alert('닉네임 변경 제한',`${dateLabel(nextNicknameChange!)}부터 다시 변경할 수 있어요.`);return;}
    setSaving(true);
    try{
      let avatarUrl=avatar;
      if(pickedUri)avatarUrl=await uploadProfileAvatar(pickedUri,pickedMimeType||'image/jpeg');
      const profile=await updateProfile({nickname:next,avatar_url:avatarUrl||null});
      setNextNicknameChange(nicknameNextChangeAt(profile?.nickname_changed_at));
      Alert.alert('저장 완료','프로필이 변경되었습니다.',[{text:'확인',onPress:()=>router.replace('/account')}]);
    }catch(e:any){Alert.alert('저장 실패',String(e?.message||e));}
    finally{setSaving(false);}
  };

  if(loading)return <View style={styles.loading}><ActivityIndicator color={C.purple}/></View>;
  return <View style={styles.root}>
    <MySubHeader title="프로필 편집"/>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
          {avatar?<Image source={{uri:avatar}} style={styles.avatar}/>:<View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>+</Text></View>}
          <View style={styles.cameraBadge}><Text style={styles.cameraText}>✦</Text></View>
        </Pressable>
        <Text style={styles.helper}>프로필 이미지를 선택해주세요</Text>
        {avatar?<Pressable onPress={deleteAvatar} disabled={saving} style={styles.avatarDelete}><Text style={styles.avatarDeleteText}>프로필 이미지 삭제</Text></Pressable>:null}

        <View style={styles.field}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            editable={!nicknameLocked}
            maxLength={12}
            placeholder="2~12자 · 한글/영문/숫자"
            placeholderTextColor={C.muted2}
            style={[styles.input,nicknameLocked&&styles.inputLocked]}
          />
          <Text style={styles.count}>{nickname.length}/12</Text>
          <Text style={styles.policy}>{nicknameLocked?`${dateLabel(nextNicknameChange!)}부터 닉네임을 다시 변경할 수 있어요.`:'닉네임은 변경 후 30일 동안 다시 변경할 수 없어요. 최초 변경은 제한 없이 가능합니다.'}</Text>
        </View>

        <Pressable disabled={saving} onPress={save} style={[styles.saveButton,saving&&{opacity:.55}]}>
          <Text style={styles.saveText}>{saving?'저장 중…':'저장하기'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  loading:{flex:1,backgroundColor:'#F7F4FC',alignItems:'center',justifyContent:'center'},
  content:{padding:22,paddingBottom:40},
  avatarWrap:{width:104,height:104,alignSelf:'center',position:'relative',marginTop:12},
  avatar:{width:104,height:104,borderRadius:52,backgroundColor:'#eee'},
  avatarPlaceholder:{width:104,height:104,borderRadius:52,backgroundColor:'#EEE8FA',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DDD3F1'},
  avatarPlaceholderText:{fontSize:38,fontWeight:'300',color:C.purpleDark},
  cameraBadge:{position:'absolute',right:-2,bottom:1,width:32,height:32,borderRadius:16,backgroundColor:C.purpleDark,borderWidth:3,borderColor:'#F7F4FC',alignItems:'center',justifyContent:'center'},
  cameraText:{fontSize:14,color:'#fff'},
  helper:{marginTop:10,textAlign:'center',fontSize:12,color:C.muted},
  avatarDelete:{alignSelf:'center',marginTop:9,paddingHorizontal:10,paddingVertical:6},
  avatarDeleteText:{fontSize:11.5,fontWeight:'700',color:C.danger},
  field:{marginTop:30},
  label:{fontSize:13,fontWeight:'900',color:C.text,marginBottom:8},
  input:{height:52,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',paddingHorizontal:16,fontSize:15,fontWeight:'700',color:C.text},
  inputLocked:{backgroundColor:'#F1EEF4',color:C.muted},
  count:{marginTop:6,textAlign:'right',fontSize:11,color:C.muted},
  policy:{marginTop:5,fontSize:10.5,lineHeight:17,color:C.muted},
  saveButton:{marginTop:28,height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},
  saveText:{fontSize:14,fontWeight:'900',color:'#fff'}
});
