import { Pressable,StyleSheet,Text,View } from 'react-native';
import MySubHeader from '../../components/MySubHeader';
import { C } from '../../lib/theme';
import { languageName,useAppLanguage } from '../../lib/i18n';
import { useRouter } from 'expo-router';

export default function Settings(){
  const router=useRouter();
  const {language}=useAppLanguage();
  const en=language==='en';
  return <View style={styles.root}>
    <MySubHeader title={en?'Settings':'설정'}/>
    <View style={styles.content}>
      <View style={styles.card}>
        <Pressable onPress={()=>router.push('/my/language')} style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>{en?'Language':'언어 설정'}</Text>
            <Text style={styles.sub}>{en?'Choose the language used in FUNY PIN.':'FUNY PIN에서 사용할 언어를 선택합니다.'}</Text>
          </View>
          <Text style={styles.value}>{languageName(language)}</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      </View>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  content:{padding:16},
  card:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},
  row:{minHeight:68,paddingHorizontal:16,flexDirection:'row',alignItems:'center'},
  copy:{flex:1},
  label:{fontSize:14,fontWeight:'900',color:C.text},
  sub:{marginTop:4,fontSize:10.5,lineHeight:15,color:C.muted},
  value:{fontSize:12.5,fontWeight:'800',color:C.purpleDark,marginLeft:12},
  chev:{marginLeft:8,fontSize:21,color:'#B0A9B5'},
});
