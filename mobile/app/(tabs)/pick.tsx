import { useState } from 'react';
import { Pressable,SafeAreaView,ScrollView,Text,View } from 'react-native';
import CmsRenderer from '../../components/CmsRenderer';
import FunyHeader from '../../components/FunyHeader';
import type { CmsPlacement } from '../../lib/cms';
import { C } from '../../lib/theme';

const tabs:{label:string;placement:CmsPlacement}[]=[
  {label:'정보',placement:'pick_information'},
  {label:'일정',placement:'pick_schedule'},
  {label:'CREATOR',placement:'pick_creator'},
  {label:'깽퐌커플 리뷰',placement:'pick_review'},
];

export default function Pick(){
  const [active,setActive]=useState(0); const current=tabs[active];
  return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
    <FunyHeader/>
    <View style={{paddingHorizontal:18,paddingTop:18,paddingBottom:11,backgroundColor:'#fff'}}>
      <Text style={{fontSize:10,fontWeight:'800',letterSpacing:2,color:'#9C92B5'}}>CURATED FOR COLLECTORS</Text>
      <Text style={{marginTop:5,fontSize:24,fontWeight:'900',letterSpacing:-.7,color:C.text}}>PICK</Text>
    </View>
    <View style={{borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:'#fff'}}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12}}>
        {tabs.map((tab,index)=>{
          const on=index===active;
          return <Pressable key={tab.placement} onPress={()=>setActive(index)} style={{marginHorizontal:3,paddingHorizontal:11,paddingVertical:12,borderBottomWidth:2,borderBottomColor:on?C.purple:'transparent'}}><Text style={{fontWeight:on?'900':'600',color:on?C.purpleDark:'#8B8490',fontSize:13}}>{tab.label}</Text></Pressable>
        })}
      </ScrollView>
    </View>
    <ScrollView key={current.placement} contentContainerStyle={{padding:14,paddingBottom:110,backgroundColor:'#fff'}} showsVerticalScrollIndicator={false}>
      <CmsRenderer placement={current.placement}/>
    </ScrollView>
  </SafeAreaView>;
}
