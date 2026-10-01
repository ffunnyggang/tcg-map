import { ViewStyle } from 'react-native';
import { C,UI } from './theme';

export const getTabBarStyle=(bottom:number):ViewStyle=>({
  height:66,
  paddingHorizontal:4,
  paddingBottom:4,
  paddingTop:4,
  marginHorizontal:13,
  borderTopWidth:0,
  borderWidth:1,
  borderColor:'rgba(255,255,255,.82)',
  borderRadius:33,
  backgroundColor:'rgba(255,255,255,.78)',
  position:'absolute',
  bottom,
  shadowColor:'#201C2A',
  shadowOpacity:.06,
  shadowRadius:12,
  shadowOffset:{width:0,height:4},
  elevation:4,
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