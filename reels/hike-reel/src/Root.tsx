import React from 'react';
import {Composition, Still} from 'remotion';
import {Cover} from './Cover';
import {Reel} from './Reel';
import {T} from './theme';
export const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} width={1080} height={1920} fps={30} durationInFrames={T.total} />
    <Still id="Cover" component={Cover} width={1080} height={1920} />
  </>
);
