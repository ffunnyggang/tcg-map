import type { ReactNode } from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C,T,UI } from '../lib/theme';

export default function MySubHeader({title,right}:{title:string;right?:ReactNode}){
  const router=useRouter();
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.header}>
      <Pressable onPress={()=>router.back()} hitSlop={10} style={styles.back}><Text allowFontScaling={false} style={styles.backText}>‹</Text></Pressable>
      <Text allowFontScaling maxFontSizeMultiplier={1} style={styles.title}>{title}</Text>
      {right?<View style={styles.right}>{right}</View>:<View style={styles.rightSpacer}/>}
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{backgroundColor:'#fff'},
  header:{height:UI.headerH,flexDirection:'row',alignItems:'center',paddingHorizontal:UI.screenPad,backgroundColor:'#fff'},
  back:{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:4},
  backText:{fontSize:29,lineHeight:30,fontWeight:'400',color:C.text,textAlign:'center'},
  title:{...T.header,color:C.text},
  right:{marginLeft:'auto',minHeight:36,alignItems:'center',justifyContent:'center'},
  rightSpacer:{marginLeft:'auto',width:36,height:36}
});
