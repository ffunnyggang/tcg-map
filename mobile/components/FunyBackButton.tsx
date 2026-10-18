import { Pressable,StyleSheet,Text } from 'react-native';
import { C } from '../lib/theme';

type Props={onPress:()=>void;accessibilityLabel?:string};

export default function FunyBackButton({onPress,accessibilityLabel='이전'}:Props){
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={10} style={styles.button}>
    <Text allowFontScaling={false} style={styles.glyph}>‹</Text>
  </Pressable>;
}

const styles=StyleSheet.create({
  button:{width:36,height:36,marginRight:4,alignItems:'center',justifyContent:'center'},
  glyph:{fontSize:29,lineHeight:29,fontWeight:'400',color:C.text,includeFontPadding:false,textAlignVertical:'center',transform:[{translateY:-1}]},
});
