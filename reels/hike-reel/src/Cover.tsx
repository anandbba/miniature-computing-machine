import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Studio, Post, Bokeh} from './three/Studio';
import {GoldNumber} from './three/GoldNumber';
import {meltState, NUM_SCALE} from './scenes/Melt';
import {anton, C, goldGradient, inter} from './theme';
import {Img, staticFile} from 'remotion';

// Cover: "Your 9% hike = 5%?" over the melting gold number. Text kept in the centre-safe area (grid crops to 3:4).
export const Cover: React.FC = () => {
  const st = meltState(200);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0.25, 7.6], fov: 34}}>
        <color attach="background" args={['#030305']} />
        <group rotation={[0.16, 0, 0]}>
          <Studio />
          <Bokeh frame={120} opacity={0.2} palette={['#ff7a2a', C.gold, C.cyan]} />
          <GoldNumber melt={st.base} hits={st.hits.map((h) => [h[0], h[1], h[2] * 0.6])} time={4} position={[0, -0.95, 0]} rotation={[0.08, -0.12, 0]} scale={NUM_SCALE} />
        </group>
        <Post bloom={1.1} />
      </ThreeCanvas>
      <div style={{position: 'absolute', left: 60, width: 900, top: 470, textAlign: 'center'}}>
        <div style={{fontFamily: inter, fontWeight: 900, fontSize: 92, color: C.white, letterSpacing: -2, textTransform: 'uppercase', textShadow: '0 10px 40px rgba(0,0,0,0.9)'}}>Your 9% hike</div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30, marginTop: 10}}>
          <div style={{fontFamily: anton, fontSize: 300, lineHeight: 1, color: C.white, opacity: 0.9}}>=</div>
          <div style={{fontFamily: anton, fontSize: 380, lineHeight: 1, backgroundImage: goldGradient, WebkitBackgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 20px 50px rgba(255,170,40,0.4))'}}>5%?</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 540 - 70, top: 250, width: 140, height: 140, borderRadius: 999, overflow: 'hidden', background: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.6)'}}>
        <Img src={staticFile('logo_hd.png')} style={{width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.06)'}} />
      </div>
    </AbsoluteFill>
  );
};
