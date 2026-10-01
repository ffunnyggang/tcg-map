import { ViewStyle } from 'react-native';
import { C,UI } from './theme';

export const getTabBarStyle=(bottom:number):ViewStyle=>({
  height:66,
  paddingHorizontal:4,
  paddingBottom:4,
  paddingTop:4,
  marginHorizontal:13,
  borderTopWidth:0,
  borderWidth:0,
  borderColor:'transparent',
  borderRadius:33,
  backgroundColor:'transparent',
  position:'absolute',
  bottom,
  shadowColor:'transparent',
  shadowOpacity:0,
  shadowRadius:0,
  shadowOffset:{width:0,height:0},
  elevation:0,
  overflow:'visible',
});

export const TAB_BAR_ITEM_STYLE:ViewStyle={
  height:56,
  borderRadius:30,
  marginHorizontal:1,
  overflow:'hidden',
};

export const TAB_ACTIVE_BG='rgba(218,211,235,.55)';
export const TAB_INACTIVE='#29262D';
export const TAB_ACTIVE=C.purpleDark;