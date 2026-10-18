import { Pressable,StyleSheet,Text } from 'react-native';
import { C } from '../lib/theme';

type Props={onPress:()=>void;accessibilityLabel?:string};

/**
 * Shared native back control matching the approved FUNY PIN web sub-header.
 * includeFontPadding=false avoids Android's extra glyph padding, which made the
 * chevron appear lower than the title on some devices.
 */
export default function NativeBackButton({onPress,accessibilityLabel='뒤로가기'}:Props){
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={10} style={({pressed})=>[styles.button,pressed&&styles.pressed]}>
    <Text allowFontScaling={false} style={styles.glyph}>‹</Text>
  </Pressable>;
}

const styles=StyleSheet.create({
  button:{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:4},
  glyph:{fontSize:29,lineHeight:29,fontWeight:'400',color:C.text,includeFontPadding:false,textAlignVertical:'center'},
  pressed:{opacity:.58},
});
