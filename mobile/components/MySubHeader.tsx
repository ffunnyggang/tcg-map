import { StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C,T,UI } from '../lib/theme';
import NativeBackButton from './NativeBackButton';

export default function MySubHeader({title}:{title:string}){
  const router=useRouter();
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.header}>
      <NativeBackButton onPress={()=>router.back()}/>
      <Text allowFontScaling maxFontSizeMultiplier={1} style={styles.title}>{title}</Text>
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{backgroundColor:'#fff'},
  header:{height:UI.headerH,flexDirection:'row',alignItems:'center',paddingHorizontal:UI.screenPad,backgroundColor:'#fff'},
  title:{...T.header,color:C.text}
});
