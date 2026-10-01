import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../lib/theme';

export default function MySubHeader({title}:{title:string}){
  const router=useRouter();
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.header}>
      <Pressable onPress={()=>router.back()} hitSlop={10} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{backgroundColor:'#fff'},
  header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:14,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:'#fff'},
  back:{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:4},
  backText:{fontSize:30,lineHeight:32,color:C.text},
  title:{fontSize:21,fontWeight:'900',letterSpacing:-.6,color:C.text}
});
