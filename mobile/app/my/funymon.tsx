import MyWebPage from '../../components/MyWebPage';
import { useAppLanguage } from '../../lib/i18n';
export default function Screen(){const {language}=useAppLanguage();return <MyWebPage path="my-funymon.html" title={language==='en'?'FUNY MON Collection':'퍼니몬 도감'}/>;}
