import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { getProfile,updateProfile,uploadProfileAvatar } from '../../lib/auth';
import { C } from '../../lib/theme';

export default function ProfileEdit(){
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [nickname,setNickname]=useState('');
  const [avatar,setAvatar]=useState<string|null>(null);
  const [pickedUri,setPickedUri]=useState<string|null>(null);
  const [pickedMimeType,setPickedMimeType]=useState<string|null>(null);
  useEffect(()=>{getProfile().then(({profile,user})=>{
    setNickname(profile?.nickname||user?.user_metadata?.nickname||user?.user_metadata?.name||'');
    setAvatar(profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null);
  }).catch(e=>Alert.alert('불러오기 실패',String(e?.message||e))).finally(()=>setLoading(false));},[]);

  const pickAvatar=async()=>{
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){Alert.alert('사진 권한 필요','프로필 이미지를 변경하려면 사진 접근 권한이 필요합니다.');return;}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.85});
    if(result.canceled||!result.assets?.[0])return;
    setPickedUri(result.assets[0].uri);
    setPickedMimeType(result.assets[0].mimeType||'image/jpeg');
    setAvatar(result.assets[0].uri);
  };

  const save=async()=>{
    const next=nickname.trim();
    if(!next){Alert.alert('닉네임을 입력해주세요.');return;}
    setSaving(true);
    try{
      let avatarUrl=avatar;
      if(pickedUri){
        avatarUrl=await uploadProfileAvatar(pickedUri,pickedMimeType||'image/jpeg');
      }
      await updateProfile({nickname:next,avatar_url:avatarUrl||null});
      Alert.alert('저장 완료','프로필이 변경되었습니다.',[{text:'확인',onPress:()=>router.back()}]);
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

        <View style={styles.field}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            maxLength={12}
            placeholder="2~12자 · 한글/영문/숫자"
            placeholderTextColor={C.muted2}
            style={styles.input}
          />
          <Text style={styles.count}>{nickname.length}/20</Text>
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
  field:{marginTop:34},
  label:{fontSize:13,fontWeight:'900',color:C.text,marginBottom:8},
  input:{height:52,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',paddingHorizontal:16,fontSize:15,fontWeight:'700',color:C.text},
  count:{marginTop:6,textAlign:'right',fontSize:11,color:C.muted},
  policy:{marginTop:6,fontSize:10.5,lineHeight:17,color:C.muted},
  saveButton:{marginTop:28,height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},
  saveText:{fontSize:14,fontWeight:'900',color:'#fff'}
});
