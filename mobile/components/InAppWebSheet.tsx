import { useEffect,useRef } from 'react';
import { Animated,Easing,Linking,Modal,Pressable,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { C } from '../lib/theme';

type Props={visible:boolean;url:string|null;title?:string;onClose:()=>void};

export default function InAppWebSheet({visible,url,title='FUNY PIN',onClose}:Props){
  const {height}=useWindowDimensions();
  const sheetHeight=height*.84;
  const translate=useRef(new Animated.Value(1)).current;
  const backdrop=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    if(!visible)return;
    translate.setValue(1);backdrop.setValue(0);
    requestAnimationFrame(()=>Animated.parallel([
      Animated.timing(translate,{toValue:0,duration:280,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
      Animated.timing(backdrop,{toValue:1,duration:180,useNativeDriver:true})
    ]).start());
  },[backdrop,translate,visible]);

  const close=()=>Animated.parallel([
    Animated.timing(translate,{toValue:1,duration:210,easing:Easing.in(Easing.cubic),useNativeDriver:true}),
    Animated.timing(backdrop,{toValue:0,duration:130,useNativeDriver:true})
  ]).start(onClose);

  return <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
    <View style={styles.modal}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.backdrop,{opacity:backdrop}]}/>
      <Pressable style={styles.dismiss} onPress={close}/>
      <Animated.View style={[styles.panel,{height:sheetHeight,transform:[{translateY:translate.interpolate({inputRange:[0,1],outputRange:[0,sheetHeight]})}]}]}>
        <View style={styles.handle}/>
        <View style={styles.header}><Text numberOfLines={1} style={styles.title}>{title}</Text><Pressable onPress={close} hitSlop={10} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
        {url?<WebView source={{uri:url}} style={styles.web} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback onShouldStartLoadWithRequest={request=>{
          const target=request.url;
          if(target.startsWith('http://')||target.startsWith('https://')||target==='about:blank')return true;
          if(target.startsWith('mailto:')||target.startsWith('tel:')){Linking.openURL(target).catch(()=>{});return false;}
          return false;
        }}/>:null}
      </Animated.View>
    </View>
  </Modal>;
}

const styles=StyleSheet.create({
  modal:{flex:1,justifyContent:'flex-end'},backdrop:{backgroundColor:'rgba(24,20,30,.38)'},dismiss:{flex:1},
  panel:{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden',shadowColor:'#211A2B',shadowOpacity:.18,shadowRadius:22,shadowOffset:{width:0,height:-6},elevation:30},
  handle:{width:42,height:5,borderRadius:99,backgroundColor:'#D8D2DD',alignSelf:'center',marginTop:8,marginBottom:4},
  header:{height:46,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{flex:1,fontSize:14,fontWeight:'800',color:C.text},close:{width:36,height:36,alignItems:'center',justifyContent:'center'},closeText:{fontSize:28,lineHeight:30,color:C.muted},web:{flex:1,backgroundColor:'#fff'}
});
