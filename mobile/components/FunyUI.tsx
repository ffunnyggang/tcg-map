import type { ReactNode } from 'react';
import { Pressable,Text,View } from 'react-native';
import { C,shadow } from '../lib/theme';

export function SectionDivider(){
  return <View style={{height:9,backgroundColor:C.divider}}/>;
}

export function SectionTitle({children,right}:{children:ReactNode;right?:ReactNode}){
  return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:16,fontWeight:'900',letterSpacing:-.3,color:C.text}}>{children}</Text>{right}</View>;
}

export function Pill({label,active=false,onPress}:{label:string;active?:boolean;onPress?:()=>void}){
  return <Pressable disabled={!onPress} onPress={onPress} style={{minHeight:34,paddingHorizontal:14,borderRadius:999,borderWidth:1,borderColor:active?'#272331':'#E5E1EB',backgroundColor:active?'#272331':'#fff',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:12,fontWeight:'700',color:active?'#fff':'#716B79'}}>{label}</Text></Pressable>;
}

export function SurfaceCard({children,padded=true}:{children:ReactNode;padded?:boolean}){
  return <View style={{padding:padded?14:0,borderWidth:1,borderColor:C.line,borderRadius:13,backgroundColor:'#fff',overflow:'hidden',...shadow}}>{children}</View>;
}

export function PrimaryButton({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){
  return <Pressable disabled={disabled} onPress={onPress} style={{height:48,paddingHorizontal:16,borderRadius:12,backgroundColor:C.purple,alignItems:'center',justifyContent:'center',opacity:disabled?.55:1,...shadow}}><Text style={{fontSize:13,fontWeight:'900',color:'#fff'}}>{label}</Text></Pressable>;
}

export function EmptyState({title,body}:{title:string;body?:string}){
  return <View style={{paddingVertical:36,paddingHorizontal:18,alignItems:'center'}}><Text style={{fontSize:15,fontWeight:'900',color:C.text}}>{title}</Text>{body?<Text style={{marginTop:7,fontSize:12,lineHeight:18,textAlign:'center',color:C.muted}}>{body}</Text>:null}</View>;
}
