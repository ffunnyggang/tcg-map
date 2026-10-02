import type { TextStyle } from 'react-native';

export const C={
  bg:'#FFFFFF',surface:'#FFFFFF',surfaceSoft:'#FAF9FC',text:'#181720',textSoft:'#4D4852',muted:'#8D8993',muted2:'#AAA3AF',line:'#E9E5ED',divider:'#F4F4F5',purple:'#8062D8',purpleDark:'#6749BD',purpleSoft:'#F0EBFB',chip:'#FAF8FF',danger:'#C62828',orange:'#F46F1B',
};

export const UI={
  headerH:54,screenPad:14,cardRadius:13,buttonRadius:12,navH:54,navBottomGap:10,contentMax:420,
};

/** Native type scale mirrors the mobile web hierarchy while keeping sub-page headers compact. */
export const T:Record<'header'|'pageTitle'|'section'|'body'|'caption'|'button'|'nav',TextStyle>={
  header:{fontSize:19,lineHeight:24,fontWeight:'800',letterSpacing:-.35},
  pageTitle:{fontSize:23,lineHeight:30,fontWeight:'900',letterSpacing:-.6},
  section:{fontSize:16,lineHeight:20,fontWeight:'800',letterSpacing:-.25},
  body:{fontSize:13,lineHeight:20,fontWeight:'500'},
  caption:{fontSize:11,lineHeight:16,fontWeight:'500'},
  button:{fontSize:13,lineHeight:17,fontWeight:'800'},
  nav:{fontSize:9,lineHeight:11,fontWeight:'700',letterSpacing:-.05},
};

export const shadow={shadowColor:'#261F2F',shadowOpacity:0.08,shadowRadius:14,shadowOffset:{width:0,height:5},elevation:2};
export const navShadow={shadowColor:'#201C2A',shadowOpacity:0.11,shadowRadius:16,shadowOffset:{width:0,height:5},elevation:7};
