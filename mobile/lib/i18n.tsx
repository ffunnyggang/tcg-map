import { createContext,useCallback,useContext,useEffect,useMemo,useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type AppLanguage='ko'|'en';
const KEY='funypin-language';

type LanguageContextValue={
  language:AppLanguage;
  ready:boolean;
  setLanguage:(language:AppLanguage)=>Promise<void>;
};

const LanguageContext=createContext<LanguageContextValue>({
  language:'ko',
  ready:false,
  setLanguage:async()=>{},
});

export function LanguageProvider({children}:{children:React.ReactNode}){
  const [language,setLanguageState]=useState<AppLanguage>('ko');
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    let alive=true;
    SecureStore.getItemAsync(KEY).then(value=>{
      if(!alive)return;
      if(value==='en'||value==='ko')setLanguageState(value);
    }).finally(()=>{if(alive)setReady(true)});
    return()=>{alive=false};
  },[]);

  const setLanguage=useCallback(async(next:AppLanguage)=>{
    setLanguageState(next);
    await SecureStore.setItemAsync(KEY,next);
  },[]);

  const value=useMemo(()=>({language,ready,setLanguage}),[language,ready,setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage(){return useContext(LanguageContext)}

export const languageName=(language:AppLanguage)=>language==='en'?'English':'한국어';
