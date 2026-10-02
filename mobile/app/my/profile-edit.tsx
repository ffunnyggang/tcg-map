import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
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
  const [previewUri,setPreviewUri]=useState<string|null>(null);
  const [previewMime,setPreviewMime]=useState<string|null>(null);
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
    if(!permission.granted){Alert.alert('사진 권한 필요','프로필 이미지를 변경하려면 사진 접근 권한이 필요해요.');return;}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.85});
    if(result.canceled||!result.assets?.[0])return;
    setPreviewUri(result.assets[0].uri);
    setPreviewMime(result.assets[0].mimeType||'image/jpeg');
  };

  const applyPreview=()=>{
    if(!previewUri)return;
    setPickedUri(previewUri);
    setPickedMimeType(previewMime||'image/jpeg');
    setAvatar(previewUri);
    setPreviewUri(null);setPreviewMime(null);
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
        <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
          {avatar?<Image source={{uri:avatar}} style={styles.avatar}/>:<View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>+</Text></View>}
          <View style={styles.cameraBadge}><Text style={styles.cameraText}>✦</Text></View>
        </Pressable>
        <Text style={styles.helper}>프로필 이미지를 선택해주세요</Text>
        <Pressable onPress={deleteAvatar} disabled={!avatar||saving} style={[styles.avatarDelete,(!avatar||saving)&&styles.avatarDeleteDisabled]}><Text style={[styles.avatarDeleteText,!avatar&&styles.avatarDeleteTextDisabled]}>프로필 이미지 삭제</Text></Pressable>

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
          <Text style={styles.policy}>{nicknameLocked?`지금은 닉네임을 변경할 수 없어요. ${dateLabel(nextNicknameChange!)}부터 다시 바꿀 수 있어요.`:'닉네임을 변경하면 30일 동안 다시 바꿀 수 없어요. 처음 정할 때는 바로 변경할 수 있어요.'}</Text>
        </View>

        <Pressable disabled={saving} onPress={save} style={[styles.saveButton,saving&&{opacity:.55}]}>
          <Text style={styles.saveText}>{saving?'저장 중…':'저장하기'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>

    <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={()=>{setPreviewUri(null);setPreviewMime(null);}}>
      <View style={styles.previewDim}>
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>프로필 이미지 미리보기</Text>
          <Text style={styles.previewHelp}>동그라미 안쪽이 실제 프로필에 보여요.</Text>
          <View style={styles.previewStage}>
            {previewUri?<Image source={{uri:previewUri}} style={styles.previewImage}/>:null}
            <View pointerEvents="none" style={styles.previewCircle}/>
          </View>
          <View style={styles.previewActions}>
            <Pressable style={styles.previewSecondary} onPress={()=>{setPreviewUri(null);setPreviewMime(null);}}><Text style={styles.previewSecondaryText}>다시 선택</Text></Pressable>
            <Pressable style={styles.previewPrimary} onPress={applyPreview}><Text style={styles.previewPrimaryText}>이 이미지 사용</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  avatarDelete:{alignSelf:'center',marginTop:9,paddingHorizontal:10,paddingVertical:7},
  avatarDeleteDisabled:{opacity:.45},avatarDeleteText:{fontSize:11.5,fontWeight:'700',color:C.danger},avatarDeleteTextDisabled:{color:C.muted},
  field:{marginTop:30},
  label:{fontSize:13,fontWeight:'900',color:C.text,marginBottom:8},
  input:{height:52,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',paddingHorizontal:16,fontSize:15,fontWeight:'700',color:C.text},
  inputLocked:{backgroundColor:'#F1EEF4',color:C.muted},
  count:{marginTop:6,textAlign:'right',fontSize:11,color:C.muted},
  policy:{marginTop:5,fontSize:10.5,lineHeight:17,color:C.muted},
  saveButton:{marginTop:28,height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},
  saveText:{fontSize:14,fontWeight:'900',color:'#fff'},
  previewDim:{flex:1,backgroundColor:'rgba(17,13,24,.64)',alignItems:'center',justifyContent:'center',padding:24},
  previewCard:{width:'100%',maxWidth:380,borderRadius:22,backgroundColor:'#fff',padding:18},
  previewTitle:{fontSize:17,fontWeight:'900',color:C.text,textAlign:'center'},previewHelp:{marginTop:6,fontSize:11.5,color:C.muted,textAlign:'center'},
  previewStage:{width:260,height:260,alignSelf:'center',marginTop:18,position:'relative',overflow:'hidden',backgroundColor:'#EEEAF2'},previewImage:{width:'100%',height:'100%',resizeMode:'cover'},
  previewCircle:{position:'absolute',left:20,top:20,width:220,height:220,borderRadius:110,borderWidth:3,borderColor:'#fff',backgroundColor:'transparent',shadowColor:'#000',shadowOpacity:.35,shadowRadius:8,shadowOffset:{width:0,height:2}},
  previewActions:{flexDirection:'row',gap:9,marginTop:18},previewSecondary:{flex:1,height:46,borderRadius:13,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},previewSecondaryText:{fontSize:12.5,fontWeight:'800',color:C.textSoft},previewPrimary:{flex:1,height:46,borderRadius:13,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},previewPrimaryText:{fontSize:12.5,fontWeight:'900',color:'#fff'}
});
