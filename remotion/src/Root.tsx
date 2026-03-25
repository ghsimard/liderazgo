import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { DirectivoVideo } from "./DirectivoVideo";
import { AdminVideo } from "./AdminVideo";

export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={480}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="directivo"
      component={DirectivoVideo}
      durationInFrames={570}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="admin"
      component={AdminVideo}
      durationInFrames={540}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
