import { useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,Image,Linking,Pressable,ScrollView,Text,View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { CmsPlacement,CmsResolvedBlock,CmsResolvedItem,cmsAbsoluteUrl,cmsItemImage,cmsItemLinkMode,cmsItemSource,cmsItemTitle,cmsItemUrl,getCmsPlacement } from '../lib/cms';
import { C } from '../lib/theme';

const align=(v?:string):'left'|'center'|'right'=>v==='center'?'center':v==='right'?'right':'left';
const blockTitleSize=(v?:string)=>v==='small'?11:v==='large'?16:13;

function useOpenItem(){
  const router=useRouter();
  return useCallback(async(item:CmsResolvedItem)=>{
    const url=cmsItemUrl(item);if(!url)return;
    if(url.startsWith('/shop/')){router.push(`/shop/${url.split('/').pop()}` as any);return}
    const mode=cmsItemLinkMode(item),absolute=cmsAbsoluteUrl(url);
    if(mode==='external'||mode==='outlink'){await Linking.openURL(absolute);return}
    await WebBrowser.openBrowserAsync(absolute,{presentationStyle:WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET});
  },[router]);
}

function CropImage({item,aspectRatio=1,fixedWidth,fixedHeight}:{item:CmsResolvedItem;aspectRatio?:number;fixedWidth?:number;fixedHeight?:number}){
  const x:any=cmsItemSource(item),uri=cmsItemImage(item),zoom=Math.max(1,Number(x?.image_zoom||1)),px=Number(x?.image_position_x??50),py=Number(x?.image_position_y??50),[size,setSize]=useState({w:fixedWidth||0,h:fixedHeight||0});
  const dx=size.w?((50-px)/50)*(size.w*(zoom-1)/2):0,dy=size.h?((50-py)/50)*(size.h*(zoom-1)/2):0;
  const style:any=fixedWidth&&fixedHeight?{width:fixedWidth,height:fixedHeight}:{width:'100%',aspectRatio};
  return <View onLayout={e=>setSize({w:e.nativeEvent.layout.width,h:e.nativeEvent.layout.height})} style={{...style,overflow:'hidden',backgroundColor:'#F1EFF2'}}>{uri?<Image source={{uri}} resizeMode="cover" style={{position:'absolute',left:0,top:0,width:'100%',height:'100%',transform:[{scale:zoom},{translateX:dx},{translateY:dy}]}}/>:null}</View>
}

function ShopSub({item,textAlign='left'}:{item:CmsResolvedItem;textAlign?:'left'|'center'|'right'}){
  return item.shop?.nearest_station?<Text style={{marginTop:3,color:'#8F8794',fontSize:9,fontWeight:'500',lineHeight:12,textAlign}} numberOfLines={1}>{item.shop.nearest_station}{item.shop.walk_minutes!=null?`에서 도보 ${item.shop.walk_minutes}분`:''}</Text>:null;
}

function CollectionCard({item,cols,textAlign}:{item:CmsResolvedItem;cols:number;textAlign:'left'|'center'|'right'}){
  const open=useOpenItem(),title=cmsItemTitle(item),hidden=!!item.title_hidden;
  if(cols===1)return <Pressable onPress={()=>open(item)} style={{minHeight:82,flexDirection:'row',alignItems:'center',gap:10,padding:8,borderWidth:1,borderColor:'#EEE8F0',borderRadius:13,backgroundColor:'#fff'}}><View style={{borderRadius:10,overflow:'hidden'}}><CropImage item={item} fixedWidth={64} fixedHeight={64}/></View><View style={{flex:1}}>{!hidden&&title?<Text style={{fontSize:12,fontWeight:'800',lineHeight:17,color:C.text,textAlign}} numberOfLines={3}>{title}</Text>:null}<ShopSub item={item} textAlign={textAlign}/></View></Pressable>;
  return <Pressable onPress={()=>open(item)} style={{borderWidth:1,borderColor:'#EEE8F0',borderRadius:12,overflow:'hidden',backgroundColor:'#fff'}}><CropImage item={item}/>{!hidden&&title?<View style={{paddingHorizontal:cols===2?7:6,paddingVertical:cols===2?9:8,backgroundColor:'#fff'}}><Text style={{fontSize:cols===2?12:11,fontWeight:'800',lineHeight:15,color:C.text,textAlign}} numberOfLines={2}>{title}</Text><ShopSub item={item} textAlign={textAlign}/></View>:null}</Pressable>;
}

function Banner({block}:{block:CmsResolvedBlock}){
  const open=useOpenItem(),scroll=useRef<ScrollView>(null),[index,setIndex]=useState(0),[width,setWidth]=useState(0),items=block.items;
  useEffect(()=>{if(items.length<2||!width)return;const seconds=Number(block.autoplay_seconds||0);if(seconds<=0)return;const id=setInterval(()=>setIndex(i=>{const n=(i+1)%items.length;scroll.current?.scrollTo({x:n*width,animated:true});return n}),seconds*1000);return()=>clearInterval(id)},[items.length,block.autoplay_seconds,width]);
  return <View onLayout={e=>{const w=e.nativeEvent.layout.width;if(w>0&&w!==width)setWidth(w)}}>
    <View style={{borderRadius:15,overflow:'hidden',backgroundColor:'#F1EFF2'}}>
      <ScrollView ref={scroll} horizontal pagingEnabled snapToInterval={width||undefined} decelerationRate="fast" showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e=>width&&setIndex(Math.round(e.nativeEvent.contentOffset.x/width))}>
        {items.map(item=><Pressable key={item.id} onPress={()=>open(item)} style={{width:width||1,aspectRatio:3}}><CropImage item={item} aspectRatio={3}/></Pressable>)}
      </ScrollView>
    </View>
    {items.length>1?<View style={{height:20,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:5}}>{items.map((_,i)=><View key={i} style={{height:6,width:i===index?16:6,borderRadius:99,backgroundColor:i===index?C.purple:'#D8D3DF'}}/>)}</View>:null}
  </View>
}

function SingleLink({block,item}:{block:CmsResolvedBlock;item:CmsResolvedItem}){
  const open=useOpenItem(),title=block.title_hidden?'':String(block.title||cmsItemTitle(item)||''),ta=align(block.title_align),style=block.style||'thumbnail';
  if(style==='background')return <Pressable onPress={()=>open(item)} style={{height:82,borderRadius:13,overflow:'hidden',justifyContent:'center',alignItems:'center',backgroundColor:'#555'}}><CropImage item={item} aspectRatio={3}/><View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(0,0,0,.38)'}}/>{title?<Text style={{position:'absolute',left:12,right:12,fontSize:12,fontWeight:'800',color:'#fff',textAlign:ta,textShadowColor:'#0008',textShadowRadius:4}}>{title}</Text>:null}</Pressable>;
  if(style==='card')return <Pressable onPress={()=>open(item)} style={{borderWidth:1,borderColor:'#EEE8F0',borderRadius:15,overflow:'hidden',backgroundColor:'#fff'}}><CropImage item={item}/>{title?<Text style={{paddingHorizontal:12,paddingTop:11,paddingBottom:12,fontSize:12,fontWeight:'800',lineHeight:17,color:C.text,textAlign:ta}}>{title}</Text>:null}</Pressable>;
  return <Pressable onPress={()=>open(item)} style={{height:82,flexDirection:'row',alignItems:'center',gap:10,padding:8,borderWidth:1,borderColor:'#EEE8F0',borderRadius:13,backgroundColor:'#fff'}}>{style==='simple'?null:<View style={{borderRadius:10,overflow:'hidden'}}><CropImage item={item} fixedWidth={64} fixedHeight={64}/></View>}{title?<Text style={{flex:1,fontSize:12,fontWeight:'800',lineHeight:17,color:C.text,textAlign:ta}} numberOfLines={3}>{title}</Text>:null}</Pressable>;
}

function Block({block}:{block:CmsResolvedBlock}){
  const ta=align(block.title_align),heading=!block.title_hidden&&block.title?<Text style={{marginBottom:9,fontSize:blockTitleSize(block.title_size),fontWeight:'800',lineHeight:18,color:C.text,textAlign:ta}}>{block.title}</Text>:null;
  if(block.block_type==='divider'){const pad=block.spacing_size==='small'?8:block.spacing_size==='large'?24:16;return <View style={{paddingVertical:pad,marginHorizontal:-16}}>{block.style==='line'?<View style={{height:9,backgroundColor:C.divider}}/>:null}</View>}
  if(block.block_type==='banner')return <View style={{marginBottom:14}}>{heading}<Banner block={block}/></View>;
  if(block.block_type==='collection'){
    const cols=block.style==='list'?1:block.style==='grid_2'?2:3;
    return <View style={{marginBottom:14}}>{heading}<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{block.items.map(item=><View key={item.id} style={{width:cols===1?'100%':cols===2?'48.9%':'31.8%'}}><CollectionCard item={item} cols={cols} textAlign={ta}/></View>)}</View></View>
  }
  return block.items[0]?<View style={{marginBottom:14}}><SingleLink block={block} item={block.items[0]}/></View>:null;
}

export default function CmsRenderer({placement,emptyText='등록된 콘텐츠가 없습니다.'}:{placement:CmsPlacement;emptyText?:string}){
  const [blocks,setBlocks]=useState<CmsResolvedBlock[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setBlocks(await getCmsPlacement(placement))}catch(e:any){setError(e?.message||'콘텐츠를 불러오지 못했습니다.')}finally{setLoading(false)}},[placement]);
  useEffect(()=>{load()},[load]);
  if(loading)return <View style={{padding:28,alignItems:'center'}}><ActivityIndicator color={C.purple}/><Text style={{marginTop:10,color:C.muted}}>콘텐츠 불러오는 중...</Text></View>;
  if(error)return <View style={{padding:18,backgroundColor:'#FFF4F4',borderRadius:14}}><Text style={{color:'#A33'}}>{error}</Text><Pressable onPress={load} style={{marginTop:10}}><Text style={{fontWeight:'800',color:C.purpleDark}}>다시 시도</Text></Pressable></View>;
  if(!blocks.length)return <Text style={{paddingVertical:24,color:'#888'}}>{emptyText}</Text>;
  return <View>{blocks.map(b=><Block key={b.id} block={b}/>)}</View>;
}
