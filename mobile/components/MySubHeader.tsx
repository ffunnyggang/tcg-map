import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C,T,UI } from '../lib/theme';

export default function MySubHeader({title}:{title:string}){
  const router=useRouter();
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.header}>
      <Pressable onPress={()=>router.back()} hitSlop={10} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <Text allowFontScaling maxFontSizeMultiplier={1.15} style={styles.title}>{title}</Text>
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{backgroundColor:'#fff'},
  header:{height:UI.headerH,flexDirection:'row',alignItems:'center',paddingHorizontal:UI.screenPad,backgroundColor:'#fff'},
  back:{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:4},
  backText:{fontSize:28,lineHeight:30,fontWeight:'400',color:C.text},
  title:{...T.header,color:C.text}
});
