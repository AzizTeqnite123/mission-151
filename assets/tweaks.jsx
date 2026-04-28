/* Mission 151 — Tweaks panel
   Lets the user preview the site as if the broadcast were in any phase
   (pre / live / post), and override how many counties are currently lit.
*/

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "phase": "auto",
  "litCount": 22
}/*EDITMODE-END*/;

function TweakApp() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    if (!window.M151) return;
    window.M151.setPreview(tweaks.phase || 'auto');
  }, [tweaks.phase]);

  React.useEffect(() => {
    if (!window.M151) return;
    if ((tweaks.phase || 'auto') === 'live') {
      window.M151.paintMaps({ litOverride: tweaks.litCount });
    } else {
      window.M151.paintMaps();
    }
  }, [tweaks.litCount, tweaks.phase]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Event phase" />
      <TweakRadio
        label="Phase"
        value={tweaks.phase}
        options={['auto', 'pre', 'live', 'post']}
        onChange={(v) => setTweak('phase', v)}
      />
      <TweakSection label="Live map" />
      <TweakSlider
        label="Counties lit"
        value={tweaks.litCount}
        min={0}
        max={64}
        step={1}
        unit=" / 64"
        onChange={(v) => setTweak('litCount', v)}
      />
    </TweaksPanel>
  );
}

const tweakRoot = document.createElement('div');
document.body.appendChild(tweakRoot);
ReactDOM.createRoot(tweakRoot).render(<TweakApp />);
