import { Pressable,StyleSheet,Text,View } from 'react-native';
import MySubHeader from '../../components/MySubHeader';
import { C } from '../../lib/theme';
import { AppLanguage,useAppLanguage } from '../../lib/i18n';

export default function LanguageSettings(){
  const {language,setLanguage}=useAppLanguage();
  const en=language==='en';
  const rows:{id:AppLanguage;label:string;sub:string}[]=[
    {id:'ko',label:'한국어',sub:'Korean'},
    {id:'en',label:'English',sub:'영어'},
  ];
  return <View style={styles.root}>
    <MySubHeader title={en?'Language':'언어 설정'}/>
    <View style={styles.content}>
      <Text style={styles.guide}>{en?'The selected language is applied to the app and FUNY PIN web content.':'선택한 언어는 앱과 FUNY PIN 웹 콘텐츠에 함께 적용됩니다.'}</Text>
      <View style={styles.card}>
        {rows.map((row,i)=>{
          const selected=language===row.id;
          return <Pressable key={row.id} onPress={()=>setLanguage(row.id)} style={[styles.row,i<rows.length-1&&styles.border]}>
            <View style={styles.copy}><Text style={styles.label}>{row.label}</Text><Text style={styles.sub}>{row.sub}</Text></View>
            <View style={[styles.radio,selected&&styles.radioOn]}>{selected?<View style={styles.dot}/>:null}</View>
          </Pressable>;
        })}
      </View>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  content:{padding:16},
  guide:{paddingHorizontal:3,marginBottom:9,fontSize:11,lineHeight:17,color:C.muted},
  card:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},
  row:{minHeight:64,paddingHorizontal:16,flexDirection:'row',alignItems:'center'},
  border:{borderBottomWidth:1,borderBottomColor:C.divider},
  copy:{flex:1},
  label:{fontSize:14,fontWeight:'900',color:C.text},
  sub:{marginTop:3,fontSize:10.5,color:C.muted},
  radio:{width:22,height:22,borderRadius:11,borderWidth:1.5,borderColor:'#CFC7DA',alignItems:'center',justifyContent:'center'},
  radioOn:{borderColor:C.purpleDark},
  dot:{width:10,height:10,borderRadius:5,backgroundColor:C.purpleDark},
});
