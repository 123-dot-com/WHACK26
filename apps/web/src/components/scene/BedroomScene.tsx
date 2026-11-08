import ChibiSprite from "../pixel/ChibiSprite";
import PixelIcon from "../pixel/PixelIcon";
import SceneStage from "./SceneStage";

export default function BedroomScene({ awake, onWake, onSleep, onPhone, phoneInHand = false, night = false, busy = false, settling = false }: {
  awake: boolean; onWake?: () => void; onSleep?: () => void; onPhone?: () => void; phoneInHand?: boolean;
  night?: boolean; busy?: boolean; settling?: boolean;
}) {
  return <SceneStage src="/art/bedroom.png" width={1672} height={941} focusX={awake ? 55 : 43}
    alt="A simple pixel bedroom with a green bed, a bedside phone, morning sunlight and a desk">
    {night && <div className="room-night-window" aria-hidden="true"><i /></div>}
    <div className={`room-character ${awake ? "room-character--awake" : "room-character--sleep"} ${settling ? "room-character--settling" : ""}`}>
      <ChibiSprite size={270} animation={settling ? "walk" : phoneInHand ? "phone" : "idle"} paused={!awake && !settling} frame={2}
        label={settling ? "Your finance bro is getting into bed" : awake ? "Your finance bro is awake beside the bed" : "Your finance bro is asleep"} />
    </div>
    {!awake && <><div className="room-blanket" /><span className="room-sleep" aria-hidden="true">z z Z</span>
      <button className="scene-hotspot room-bed-hotspot" disabled={busy || settling} onClick={onWake}><span>{settling ? "Falling asleep…" : "Wake up"}</span></button></>}
    {awake && onSleep && <button className="scene-hotspot room-bed-hotspot" disabled={busy || settling} onClick={onSleep}><span><PixelIcon name="moon" /> Go to sleep</span></button>}
    {awake && <button className="scene-hotspot room-phone-hotspot" disabled={busy || settling} onClick={onPhone} aria-label="Pick up phone">
      <span><PixelIcon name="phone" /> Check phone <i className="notification-dot" /></span></button>}
    <div className="room-workdesk" aria-hidden="true"><div className="room-laptop"><span>↗</span></div><div className="room-coffee" /></div>
  </SceneStage>;
}
