import { ViewStyle } from 'react-native';
import { C,UI } from './theme';

export const getTabBarStyle=(bottom:number):ViewStyle=>({
  height:UI.navH+4,
  paddingBottom:5,
  paddingTop:5,
  marginHorizontal:14,
  borderTopWidth:0,
  borderWidth:1,
  borderColor:'rgba(255,255,255,.82)',
  borderRadius:34,
  backgroundColor:'rgba(255,255,255,.52)',
  position:'absolute',
  bottom,
  shadowColor:'#201C2A',
  shadowOpacity:.14,
  shadowRadius:30,
  shadowOffset:{width:0,height:12},
  elevation:12,
  overflow:'hidden',
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