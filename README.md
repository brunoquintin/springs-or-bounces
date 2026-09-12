# Springs or Bounces

Physical follow-through for any keyframed property in After Effects, in
one click. Select keyframed properties, click **Springs** or **Bounces**:
each property gets an expression, and a pseudo-effect appears in the
Effect Controls to tune it.

- **Springs** — Amplitude, Frequency, Number of springs, Extra damping,
  Rebounds. The property overshoots where it arrives and oscillates around
  it, like the end of a spring.
- **Bounces** — First bounce duration (f), Damping, Amplitude. The property
  bounces off where it arrives like a ball, each bounce shorter than the
  one before.

Both start with an **Expression** menu, Enable / Disable, keyframable: on
Disable the property returns its plain keyframed value, so the effect can
be switched off — or animated on and off — without removing anything.

The animation comes from the keyframes already there. After a move ends,
the expression takes the velocity the property arrived with and lets it
ring out (Springs) or bounce out (Bounces) from the value the keyframes
hold. It plays only while the property is holding still after a move,
never during the move, and needs at least two keyframes.

The third button, **Remove**, takes it all away from the selected
properties: expression cleared, pseudo-effect deleted — or renamed after
the properties still using it, if some weren't selected. The fourth,
**?**, opens a short user guide.

## Click modifiers

- **Ctrl-click** Springs or Bounces (**Cmd-click** on macOS) puts the
  controller on a shared shape layer named "Control Layer", created on
  demand, to drive every spring and bounce of a comp from one place.
  Cameras, lights and 3D model layers can't carry effects, so they always
  use it. Controllers there are named after the layer they drive:
  `Springs - Ball > Position`.
- **Alt-click** (**Option-click** on macOS) creates one controller per
  selected property instead of one for all of them, so several properties
  can be tuned independently in a single click.
- The two combine.

## One controller per application

Every click creates its own pseudo-effect, named after what it drives, so
a layer can carry several springs and bounces side by side and each
expression knows which one is its own:

```
Springs - Position
Springs - Position, Scale, Rotation
Bounces - Slider Control > Slider, Angle
Springs 1, Springs 2, ...            (beyond three properties)
```

A name already present on the layer gets the next free number. Applying
again on a property that is already driven detaches it from its current
controller first — deleted if nothing else uses it, renamed otherwise — so
no orphaned effect is ever left behind.

## Design notes

- **Built on `velocityAtTime()`.** The follow-through is driven by the
  speed the property had just before it stopped, which makes it
  proportional to the motion with no manual "strength" keyframe. Velocity
  only exists for numeric properties, so the tool applies to 1D/2D/3D
  values only: Position, Scale, Rotation, Opacity, sliders, points…
- **Bounces land on frames.** Bounce durations are whole frames: the first
  is "First bounce duration (f)", each next one is shortened by Damping %
  of the previous (rounded up to whole frames) until they're down to two
  frames. Measured from the arrival keyframe, every contact falls exactly
  on a frame, never between two — a between-frames contact is never
  rendered and would read as the ball stopping short of the floor.
- **"Number of springs" takes decimals** on purpose: one spring is one
  full oscillation, out and back, so 2.5 springs ends on an outward swing.

## What is skipped, and why

Anything in the selection that can't take the expression is passed over
in silence — no dialog, no partial application. If nothing in the
selection qualifies, a click does nothing at all.

- Property group headers, colors, paths, text — nothing with a velocity.
- Dropdown menus and checkboxes: numeric as far as After Effects is
  concerned, but they only take hold keyframes, so nothing moves between
  two of them.
- Orientation: interpolated as one shortest-arc rotation, not three
  independent angles, so its velocity can't be added back onto the value.
- Any property already carrying an expression this script did not write.
  Someone else's work is never overwritten.

## Install

It's a dockable panel, so it goes in the ScriptUI Panels folder rather
than the plain Scripts folder. Menu commands below are in English; adapt
them to whatever language your copy of After Effects runs in.

1. Open After Effects.
2. `File > Scripts > Install ScriptUI Panel...` and pick
   `Springs or Bounces.jsx`.
3. Restart After Effects.
4. Open it from the bottom of the `Window` menu: `Springs or Bounces.jsx`.
5. In `Preferences > Scripting & Expressions`, enable **Allow Scripts to
   Write Files and Access Network** — the pseudo-effect is written as a
   temporary preset file at each application. The panel tells you if it's
   missing and offers to open the preferences.

You can also run it without installing, via `File > Scripts > Run Script
File`, in which case it opens as a floating palette instead of a dockable
panel.

## Notes and limitations

- The pseudo-effects are built in memory and applied as a temporary
  `.ffx` preset, deleted immediately. Nothing to install alongside, no
  plugin, no binary blob: this `.jsx` is the whole tool.
- Every default and range is plain data near the top of the file
  (`FX_SPRINGS`, `FX_BOUNCES`) and can be edited in a text editor. Read the
  comments around them before changing the order of the controls.
- The buttons are a fixed 60 × 36 px and stack vertically when the panel
  is taller than it is wide. Icon and border colours follow your After
  Effects UI brightness preference.
- Tested on After Effects 2026 (26.3) on Windows and macOS.

## Status

Vibecoded and offered without warranty — the person running it assumes
full responsibility for its use. It writes expressions and adds effects to
whatever you have selected, and every action is a single undo step.

## License

[CC0 1.0 Universal](LICENSE). Public domain, to the extent possible under
law — copy it, change it, ship it inside your own tools, with or without
credit.

The expression bodies were first turned into script strings with the
Scriptifier of [Duik Angela](https://rxlaboratorio.org/rx-tool/duik/).
