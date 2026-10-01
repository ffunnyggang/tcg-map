import { ViewStyle } from 'react-native';
import { C,UI } from './theme';

export const getTabBarStyle=(bottom:number):ViewStyle=>({
  height:UI.navH,
  paddingBottom:4,
  paddingTop:4,
  marginHorizontal:17,
  borderTopWidth:0,
  borderWidth:1,
  borderColor:'rgba(255,255,255,.88)',
  borderRadius:34,
  backgroundColor:'transparent',
  position:'absolute',
  bottom,
  shadowColor:'#201C2A',
  shadowOpacity:.16,
  shadowRadius:38,
  shadowOffset:{width:0,height:14},
  elevation:10,
});

export const TAB_BAR_ITEM_STYLE:ViewStyle={
  height:56,
  borderRadius:30,
  marginHorizontal:1,
  overflow:'hidden',
};

export const TAB_ACTIVE_BG='rgba(226,220,239,.52)';
export const TAB_INACTIVE='#29262D';
export const TAB_ACTIVE=C.purpleDark;