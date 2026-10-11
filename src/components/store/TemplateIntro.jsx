import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
const copy = {
  fresh: ['COSECHA ABIERTA', 'Del campo a tu cesta'], butcher: ['MAESTROS DEL CORTE', 'Origen · oficio · fuego'],
  barber: ['THE NEXT CUT', 'Style is an attitude'], spa: ['BREATHE IN', 'Tu ritual comienza aquí'], retail: ['NEW DROP', 'Curated for right now'],
};
const scenes = {
  fresh: <div className="intro-fresh-art"><i/><i/><i/><span>HOY</span></div>,
  butcher: <div className="intro-butcher-art"><span className="intro-knife"/><b>01</b><em>SELECTED CUTS</em></div>,
  barber: <div className="intro-barber-art"><span/><span/><b>CUT<br/>THE<br/>NOISE</b></div>,
  spa: <div className="intro-spa-art"><i/><i/><i/><span>◌</span></div>,
  retail: <div className="intro-retail-art"><i>R</i><i>N</i><i>O</i><span>DROP 06</span></div>,
};

export default function TemplateIntro({ variant, name, slug }) {
  const reduce = useReducedMotion();
  const [done,setDone] = useState(false);
  const [eyebrow,line] = copy[variant] || copy.spa;
  useEffect(()=>{const key=`rinno-intro-v3:${variant}:${slug}`;if(sessionStorage.getItem(key)){setDone(true);return;}const id=setTimeout(()=>{setDone(true);sessionStorage.setItem(key,'1')},reduce?100:2300);return()=>clearTimeout(id)},[variant,slug,reduce]);
  return <motion.div className={`rinno-intro rinno-intro-${variant}`} animate={done?{opacity:0,visibility:'hidden'}:{opacity:1}} transition={{duration:reduce?.05:.55}} aria-hidden="true">
    <motion.div className="rinno-intro-curtain" animate={done?{scaleY:0}:{scaleY:1}} transition={{duration:.75,ease:[.76,0,.24,1]}}/>
    <div className="rinno-intro-stage">
      <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>{eyebrow}</motion.p>
      <motion.div initial={{opacity:0,scale:.82}} animate={{opacity:1,scale:1}} transition={{duration:reduce?.05:1,ease:[.16,1,.3,1]}}>{scenes[variant] || scenes.spa}</motion.div>
      <motion.strong initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:reduce?0:.2,duration:.65}}>{name}</motion.strong>
      <small>{line}</small>
      <div className="rinno-intro-progress"><motion.i initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:reduce?.05:1.9,ease:'easeInOut'}}/></div>
    </div>
  </motion.div>;
}
