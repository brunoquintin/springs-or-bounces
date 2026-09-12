/*
================================================================================
    Springs or Bounces  v1.5
    Physical follow-through for any keyframed property, in one click.

    Adobe After Effects script (ExtendScript, based on ECMAScript 3).
    Author: Bruno Quintin
    Licence: CC0 1.0 Universal. To the extent possible under law, the author
    has waived all copyright and related rights to this work. Copy it, change
    it, ship it inside your own tools, with or without credit.

    Vibecoded script. Its use is offered without warranty; the user therefore
    assumes full responsibility for its use.
================================================================================

    WHAT IT DOES
    ------------
    Select one or more keyframed properties, click Springs or Bounces. Each
    property receives an expression, and a pseudo-effect appears in the
    Effect Controls to tune it:

      Springs   Amplitude, Frequency, Number of springs, Extra damping,
                Rebounds. The property overshoots its arrival and oscillates
                around it, like the end of a spring.
      Bounces   First bounce duration (f), Damping, Amplitude. The property
                bounces off its arrival like a ball, each bounce shorter than
                the one before.

    "Number of springs" takes decimals on purpose: one spring is one full
    oscillation, out and back, so 2.5 springs ends on an outward swing.

    Both start with an "Expression" menu, Enable / Disable, keyframable: on
    Disable the property returns its plain keyframed value, so the effect can
    be switched off, or animated on and off, without removing anything.

    The animation itself comes from the keyframes already there. Nothing is
    added to the property except the expression: after a move ends, the
    expression takes the velocity the property arrived with and lets it ring
    out or bounce out from the value the keyframes hold. It plays only while
    the property is holding still after a move, never during the move, and
    needs at least two keyframes to have a move to react to.

    The third button, Remove, takes it all away again from the selected
    properties: expression cleared, pseudo-effect deleted, or renamed after
    the properties still using it if some were not selected. The fourth,
    "?", opens a short user guide -- the only dialog this script has.

    ONE CONTROLLER PER APPLICATION
    ------------------------------
    Every click creates its own pseudo-effect, named after what it drives, so
    a layer can carry several springs and bounces side by side and each
    expression knows which one is its own:

        Springs - Position
        Springs - Position, Scale, Rotation
        Bounces - Slider Control > Slider, Angle
        Springs 1, Springs 2, ...            (beyond three properties)

    A name already present on the layer gets the next free number.

    Alt-click Springs or Bounces (Option-click on macOS) to get one
    controller PER PROPERTY instead of one per layer: Position, Scale and
    Rotation selected together then each get their own "Springs - ..." and
    can be tuned independently, in one click instead of three.

    Applying again on a property that is already driven detaches it from
    its current controller first: that controller is deleted if nothing else
    uses it, or renamed after what still does, so no orphaned effect is left
    behind.

    THE CONTROL LAYER
    -----------------
    Cameras, lights and 3D model layers cannot carry an effect, so their
    controllers are hosted on a hidden shape layer named "Control Layer",
    created on demand in the comp, and the expression reads it from there.
    Ctrl-click Springs or Bounces (Cmd-click on macOS) to route every other
    layer through it as well and drive all the springs and bounces of a comp
    from one place; add Alt (Option) for one controller per property there
    too. Names on the Control Layer say which layer they drive:
    "Springs - Ball > Position". Remove deletes the Control Layer once it
    holds nothing any more.

    WHY velocityAtTime, AND WHAT IS SKIPPED
    ---------------------------------------
    The expressions are built on velocityAtTime(): the follow-through is
    driven by the speed the property had just before it stopped, and starts
    when its current velocity drops to zero. That is what makes the result
    proportional to the motion and free of any manual "strength" keyframe --
    and it is a design choice with a consequence: velocity only exists for
    numeric properties, so this script only ever applies to 1D, 2D and 3D
    values (Position, Scale, Rotation, Opacity, sliders, points...).

    Anything else in the selection is passed over in silence, no dialog, no
    partial application -- and if nothing in the selection qualifies, or no
    comp is active, the click does nothing at all. Skipped:

      - Property GROUPS (a clicked "Transform" header), colors, paths, text
        -- nothing with a velocity to speak of.
      - Dropdown menus and checkboxes. They are numeric as far as After
        Effects is concerned, but only ever take hold keyframes, so nothing
        moves between two of them.
      - Orientation. After Effects interpolates it as one rotation along the
        shortest arc, not as three independent angles, so its velocity is
        not something that can be added back onto the value.
      - Any property already carrying an expression that this script did not
        write. Someone else's work is never overwritten.

    BOUNCES LAND ON FRAMES
    ----------------------
    Bounce durations are counted in whole frames, not seconds: the first one
    is "First bounce duration (f)", each following one is shortened by
    Damping percent, rounded up to a whole frame, until a bounce would last
    two frames or less. Measured from the keyframe the property arrived on,
    every contact therefore falls exactly on a frame, never between two. A
    contact between two frames is never seen: the ball would look as if it
    stopped short of the floor. Landing on the frame keeps every impact
    crisp.

    HOW THE PSEUDO-EFFECTS ARE BUILT
    --------------------------------
    The two pseudo-effects are declared as plain data in this file
    (FX_SPRINGS, FX_BOUNCES) and compiled into a .ffx preset in memory at
    each application by the PseudoFX object below, applied, then the
    temporary file is deleted. Nothing to install alongside, no binary blob,
    no external file: this .jsx is the whole tool. This is also why After
    Effects' "Allow Scripts to Write Files and Access Network" preference
    must be enabled -- the panel says so, and offers to open the preferences,
    when it is not.

    Every default and range is a number in FX_SPRINGS / FX_BOUNCES and can be
    edited there. See the notes around PseudoFX and DEV_MODE before touching
    the "id" fields or the order of the controls.

    HOW THE ICONS ARE DRAWN
    -----------------------
    Each icon is a list of path commands (moveTo, lineTo, cubic curveTo) on
    its own nominal box, flattened into line segments and stroked with the
    ScriptUI Graphics API on every repaint. Colours are picked once at
    startup from the After Effects UI brightness, so the panel matches a
    light or a dark interface. The buttons keep a fixed 60 x 36 px size and
    stack vertically when the panel is taller than it is wide, so the panel
    reads the same docked in a side column as floating above the timeline.

    The expression bodies were first turned into script strings with the
    Scriptifier of Duik Angela (https://rxlaboratorio.org/rx-tool/duik/).

    INSTALLATION
    ------------
    Dockable panel - it must go in the ScriptUI Panels folder to appear in the
    Window menu. Menu commands below are given in English; adapt them to
    whatever language your copy of After Effects is currently running in.
    1. Open After Effects.
    2. Go to File > Scripts > Install ScriptUI Panel...
    3. Restart After Effects.
    4. Open it from the Window menu, at the bottom: "Springs or Bounces.jsx".
    5. In Preferences > Scripting & Expressions, enable "Allow Scripts to
       Write Files and Access Network".

    It can also be run without installing, via File > Scripts > Run Script
    File, in which case it opens as a floating palette instead of a dockable
    panel.
================================================================================
*/

(function (thisObj) {

    var PREF_KEY = "Pref_SCRIPTING_FILE_NETWORK_SECURITY";

    // Click modifiers. Ctrl (Cmd on macOS, where Ctrl-click is the
    // right-click) asks for the Control Layer; Alt (Option on macOS, same
    // altKey flag) asks for one controller per property.
    var IS_MAC = (File.fs === "Macintosh");
    var CTRL_LABEL = IS_MAC ? "Cmd" : "Ctrl";
    var ALT_LABEL  = IS_MAC ? "Option" : "Alt";
    function clickOptions(event) {
        return {
            controlLayer: !!event && (IS_MAC ? !!event.metaKey : !!event.ctrlKey),
            perProperty:  !!event && !!event.altKey
        };
    }

    // Theme-adaptive colors
    var isLight = false;
    try {
        isLight = app.preferences.getPrefAsFloat(
            "Main Pref Section v2",
            "User Interface Brightness (4) [0.0..1.0]",
            PREFType.PREF_Type_MACHINE_INDEPENDENT
        ) > 0.5;
    } catch (e) {}
    var COLOR_ICON   = isLight ? [0.1,  0.1,  0.1,  1] : [0.8,  0.8,  0.8,  1];
    var COLOR_BORDER = isLight ? [0.45, 0.45, 0.45, 1] : [0.38, 0.38, 0.38, 1];
    var COLOR_BG     = isLight ? [0.80, 0.80, 0.80, 1] : [0.18, 0.18, 0.18, 1];
    var COLOR_HOVER  = isLight ? [0.65, 0.65, 0.65, 1] : [0.35, 0.35, 0.35, 1];

    // SVG path commands for button icons (absolute coordinates converted from SVG viewBox)
    var SVG_SPRING_W = 1587.88, SVG_SPRING_H = 875.01;
    var SVG_SPRING_CMDS = [
        {t:"M", x:6.75,     y:9.92},
        {t:"C", x1:358.89,  y1:249.24, x2:261.45,  y2:848.38, x:365.72,  y:862.91},
        {t:"C", x1:433.13,  y1:872.30, x2:487.53,  y2:182.27, x:569.30,  y:182.69},
        {t:"C", x1:640.34,  y1:183.06, x2:684.52,  y2:650.94, x:771.70,  y:670.60},
        {t:"C", x1:844.14,  y1:686.93, x2:881.03,  y2:361.85, x:975.12,  y:350.94},
        {t:"C", x1:1034.09, y1:344.10, x2:1094.78, y2:534.70, x:1171.70, y:533.85},
        {t:"C", x1:1222.60, y1:533.28, x2:1284.93, y2:461.28, x:1335.80, y:459.49},
        {t:"C", x1:1390.51, y1:457.57, x2:1463.30, y2:481.32, x:1587.08, y:473.17}
    ];

    var SVG_BOUNCE_W = 1583.88, SVG_BOUNCE_H = 897.35;
    var SVG_BOUNCE_CMDS = [
        {t:"M", x:9.46,     y:7.38},
        {t:"C", x1:185.53,  y1:233.02, x2:249.63,  y2:533.02, x:267.58,  y:790.59},
        {t:"C", x1:374.42,  y1:109.09, x2:488.95,  y2:54.38,  x:598.35,  y:790.59},
        {t:"C", x1:676.98,  y1:345.84, x2:785.53,  y2:436.44, x:844.50,  y:790.59},
        {t:"C", x1:911.17,  y1:546.69, x2:976.98,  y2:566.35, x:1037.66, y:790.59},
        {t:"C", x1:1083.81, y1:640.71, x2:1148.77, y2:691.14, x:1175.27, y:790.59},
        {t:"C", x1:1218.86, y1:697.97, x2:1261.59, y2:737.29, x:1283.82, y:790.59},
        {t:"C", x1:1303.06, y1:756.57, x2:1334.52, y2:755.42, x:1355.61, y:790.59},
        {t:"C", x1:1374.53, y1:773.61, x2:1392.76, y2:772.75, x:1408.17, y:790.42},
        {t:"C", x1:1423.82, y1:776.01, x2:1437.16, y2:785.87, x:1442.08, y:790.26},
        {t:"C", x1:1450.46, y1:786.45, x2:1459.84, y2:786.29, x:1470.20, y:790.15},
        {t:"C", x1:1512.52, y1:790.22, x2:1583.81, y2:790.60, x:1583.81, y:790.60}
    ];

    // Trash can, hand-drawn on a 100 x 100 box (lid, handle, body, two grooves).
    var SVG_TRASH_W = 100, SVG_TRASH_H = 100;
    var SVG_TRASH_CMDS = [
        {t:"M", x:18, y:26}, {t:"L", x:82, y:26},
        {t:"M", x:40, y:26}, {t:"L", x:40, y:14}, {t:"L", x:60, y:14}, {t:"L", x:60, y:26},
        {t:"M", x:26, y:26}, {t:"L", x:31, y:88}, {t:"L", x:69, y:88}, {t:"L", x:74, y:26},
        {t:"M", x:43, y:38}, {t:"L", x:45, y:76},
        {t:"M", x:57, y:38}, {t:"L", x:55, y:76}
    ];

    // Question mark on a 100 x 100 box, for the help button.
    var SVG_HELP_W = 100, SVG_HELP_H = 100;
    var SVG_HELP_CMDS = [
        {t:"M", x:33, y:36},
        {t:"C", x1:33, y1:20, x2:44, y2:13, x:52, y:13},
        {t:"C", x1:63, y1:13, x2:70, y2:22, x:70, y:33},
        {t:"C", x1:70, y1:46, x2:52, y2:48, x:52, y:64},
        {t:"M", x:52, y:76}, {t:"L", x:52, y:86}
    ];

    function drawPathCmds(g, cmds, px, py) {
        var cx = 0, cy = 0;
        g.newPath();
        for (var i = 0; i < cmds.length; i++) {
            var c = cmds[i];
            if (c.t === "M") {
                g.moveTo(px(c.x), py(c.y));
                cx = c.x; cy = c.y;
            } else if (c.t === "L") {
                g.lineTo(px(c.x), py(c.y));
                cx = c.x; cy = c.y;
            } else if (c.t === "C") {
                for (var j = 1; j <= 20; j++) {
                    var t = j / 20, mt = 1 - t;
                    var bx = mt*mt*mt*cx + 3*mt*mt*t*c.x1 + 3*mt*t*t*c.x2 + t*t*t*c.x;
                    var by = mt*mt*mt*cy + 3*mt*mt*t*c.y1 + 3*mt*t*t*c.y2 + t*t*t*c.y;
                    g.lineTo(px(bx), py(by));
                }
                cx = c.x; cy = c.y;
            }
        }
    }

    // Buttons keep a fixed 60 x 36 px size whatever the panel width; the icon
    // is fitted inside and stroked strokeW units wide (in the icon's own box).
    var BUTTON_W = 60, BUTTON_H = 36;

    function addSvgButton(parent, cmds, svgW, svgH, strokeW, tip) {
        var btn = parent.add("group");
        btn.preferredSize = [BUTTON_W, BUTTON_H];
        btn.minimumSize   = [BUTTON_W, BUTTON_H];
        btn.maximumSize   = [BUTTON_W, BUTTON_H];
        btn.alignment     = ["left", "center"];
        btn.helpTip       = tip || "";
        btn.hovered       = false;

        var g        = btn.graphics;
        var bgNormal = g.newBrush(g.BrushType.SOLID_COLOR, COLOR_BG);
        var bgHover  = g.newBrush(g.BrushType.SOLID_COLOR, COLOR_HOVER);
        g.backgroundColor = bgNormal;

        btn.onDraw = function () {
            var w = this.size[0], h = this.size[1];
            var g = this.graphics;

            // Background (g.backgroundColor is not rendered when onDraw is defined)
            g.newPath();
            g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h); g.lineTo(0, 0);
            g.fillPath(btn.hovered ? bgHover : bgNormal);

            // Border
            g.newPath();
            g.moveTo(0.5, 0.5); g.lineTo(w - 0.5, 0.5);
            g.lineTo(w - 0.5, h - 0.5); g.lineTo(0.5, h - 0.5); g.lineTo(0.5, 0.5);
            g.strokePath(g.newPen(g.PenType.SOLID_COLOR, COLOR_BORDER, 1));

            // Icon
            var pad = 6;
            var s   = Math.min((w - pad * 2) / svgW, (h - pad * 2) / svgH);
            var ox  = (w - svgW * s) / 2;
            var oy  = (h - svgH * s) / 2;
            function px(x) { return ox + x * s; }
            function py(y) { return oy + y * s; }
            drawPathCmds(g, cmds, px, py);
            g.strokePath(g.newPen(g.PenType.SOLID_COLOR, COLOR_ICON, Math.max(2, Math.round(strokeW * s))));
        };

        btn.addEventListener("mouseover", function () {
            btn.hovered = true;
            btn.graphics.backgroundColor = bgHover;
        });
        btn.addEventListener("mouseout", function () {
            btn.hovered = false;
            btn.graphics.backgroundColor = bgNormal;
        });
        btn.addEventListener("click", function (event) {
            if (typeof btn.onClick === "function") btn.onClick(event);
        });

        return btn;
    }

    function hasWriteFilesAccess() {// Check if the script may write files on disk, needed to write the temporary .ffx preset.
        app.preferences.saveToDisk();
        app.preferences.reload();

        if (typeof PREFType !== "undefined") {
            try {
                if (app.preferences.havePref("Main Pref Section v2", PREF_KEY, PREFType.PREF_Type_MACHINE_SPECIFIC)) {
                    return app.preferences.getPrefAsLong("Main Pref Section v2", PREF_KEY, PREFType.PREF_Type_MACHINE_SPECIFIC) == 1;
                }
            } catch (errV2) {
            }
        }

        try {
            if (app.preferences.havePref("Main Pref Section", PREF_KEY)) {
                return app.preferences.getPrefAsLong("Main Pref Section", PREF_KEY) == 1;
            }
        } catch (errV1) {
        }

        return false;
    }

    // PseudoFX -- compiles a declarative pseudo-effect spec (slider, checkbox
    // and popup controls) into a .ffx preset in memory, applies it to a
    // layer, then deletes the temporary file. No #include, no external file
    // of any kind: this whole script is the unit of distribution and runs
    // unmodified on any machine, Windows or macOS.
    //
    // ----------------------------------------------------------------------
    // CONTROL TYPES
    // ----------------------------------------------------------------------
    // slider
    //     value                  default value
    //     min / max              valid range, i.e. what can be typed in the field
    //     sliderMin / sliderMax  slider travel (defaults to min / max)
    //     precision              number of decimals (default 1)
    //     percent                true to display a % sign. Display only: the
    //                            stored value stays raw, 20 reads back as 20
    //                            and not as 0.2, so an expression expecting a
    //                            fraction must divide by 100 itself.
    // checkbox
    //     value                  true / false
    //     label                  optional label shown next to the checkbox
    // popup
    //     options                array of item labels, in menu order. An
    //                            item named "(-" is a separator line.
    //     value                  default item as a 1-based index (1 = first
    //                            option). An expression reads the same
    //                            1-based index back, never the label.
    //
    // Other control types (angle, color, point, point3d, groups) are not
    // implemented -- pardFor() throws on anything else. Add support only if
    // a future control genuinely needs one of them, and find its byte layout
    // by decoding a real .ffx (Scripts/ffx2spec) rather than guessing.
    //
    // ----------------------------------------------------------------------
    // THE "id" FIELD
    // ----------------------------------------------------------------------
    // id becomes the effect's matchName ("Pseudo/770127", "Pseudo/770128").
    // It identifies one exact control LAYOUT, not a version of the tool:
    // controls are addressed by position (-0001, -0002, ...), never by name,
    // so an id is bound to its list of controls in that order.
    //
    //   - Editing a control's default, bounds or precision keeps the layout:
    //     keep the id.
    //   - Inserting, removing or reordering a control changes the layout:
    //     the id MUST change with it (pick the next free number). Reusing
    //     the old id would make projects that already carry the old layout
    //     read the shifted controls as garbage.
    //   - Appending a control at the very end has not been tested against
    //     projects carrying the previous layout; treat it as a layout change.
    //
    // A new id does not break existing projects: the definition they use is
    // stored inside the .aep, so their effects and expressions keep working.
    //
    // After Effects also caches a pseudo-effect definition for the whole
    // session, the first time it sees it. Changing the control list without
    // changing the id raises, until AE is restarted:
    //   "Duplicate matchname found during FillInStreamsFromCanonicalLayout"
    // See DEV_MODE (below FX_SPRINGS/FX_BOUNCES) for how to iterate on a
    // spec without restarting AE or burning ids.

    var PseudoFX = (function () {

        // ---- byte writers ----

        function u8(v)  { return String.fromCharCode(v & 255); }
        function u16(v) { return u8(v >> 8) + u8(v); }
        function u32(v) { return u16(Math.floor(v / 65536) & 65535) + u16(v % 65536); }

        function zeros(n) { var s = ""; for (var i = 0; i < n; i++) { s += "\0"; } return s; }
        function zerosHex(nBytes) { var s = ""; for (var i = 0; i < nBytes; i++) { s += "00"; } return s; }

        function f64(v) {
            if (v === 0) { return zeros(8); }
            var s = 0;
            if (v < 0) { s = 1; v = -v; }
            var e = Math.floor(Math.log(v) / Math.LN2);
            var m = v / Math.pow(2, e);
            if (m < 1) { e--; m = v / Math.pow(2, e); }
            if (m >= 2) { e++; m = v / Math.pow(2, e); }
            var be = e + 1023;
            var frac = Math.round((m - 1) * Math.pow(2, 52));
            if (frac >= Math.pow(2, 52)) { frac = 0; be++; }
            var hi = Math.floor(frac / 4294967296);
            var lo = frac - hi * 4294967296;
            return u8((s << 7) | (be >> 4)) + u8(((be & 15) << 4) | ((hi >> 16) & 15)) +
                   u8(hi >> 8) + u8(hi) + u32(lo);
        }

        function f32(v) {
            if (v === 0) { return zeros(4); }
            var s = 0;
            if (v < 0) { s = 1; v = -v; }
            var e = Math.floor(Math.log(v) / Math.LN2);
            var m = v / Math.pow(2, e);
            if (m < 1) { e--; m = v / Math.pow(2, e); }
            if (m >= 2) { e++; m = v / Math.pow(2, e); }
            var be = e + 127;
            var frac = Math.round((m - 1) * 8388608);
            if (frac >= 8388608) { frac = 0; be++; }
            return u8((s << 7) | (be >> 1)) + u8(((be & 1) << 7) | ((frac >> 16) & 127)) +
                   u8(frac >> 8) + u8(frac);
        }

        function hexToBin(h) {
            var s = "";
            for (var i = 0; i < h.length; i += 2) { s += u8(parseInt(h.substr(i, 2), 16)); }
            return s;
        }

        // Fixed-size zero-filled scratch buffer, written at absolute offsets.
        function Buf(n) { this.a = []; for (var i = 0; i < n; i++) { this.a.push(0); } }
        Buf.prototype.put = function (off, s) {
            for (var i = 0; i < s.length; i++) { this.a[off + i] = s.charCodeAt(i) & 255; }
        };
        Buf.prototype.str = function () {
            var o = "";
            for (var i = 0; i < this.a.length; i++) { o += String.fromCharCode(this.a[i]); }
            return o;
        };

        // ---- RIFX chunks ----
        // The declared size is the real size; the optional padding byte is
        // written on top of it. Utf8 strings are the exception: AE pads the
        // string itself and declares the padded size.

        function chunk(id, data) {
            var n = data.length;
            var d = data;
            if (n % 2) { d += "\0"; }
            return id + u32(n) + d;
        }
        function list(type, data) { return chunk("LIST", type + data); }

        function utfChunk(id, text) {
            var body = "Utf8" + u32(text.length) + text;
            if (body.length % 2) { body += "\0"; }
            return id + u32(body.length) + body;
        }
        // A matchName is a fixed 40-byte, zero-padded field.
        function tdmn(name) {
            var s = name;
            while (s.length < 40) { s += "\0"; }
            return chunk("tdmn", s.substr(0, 40));
        }

        // ---- fixed byte patterns, as found in .ffx / .aep files written by AE ----

        var HEAD = hexToBin("00000003000000610000000701000000");
        var BESO_HEX = "00000001000000010000000000006000001800000000000300010001@@@@@@@@3ff00000000000003ff000000000000000000000ffffffff";
        function hex4(n) { var h = n.toString(16); while (h.length < 4) { h = "0" + h; } return h; }
        function beso(w, h) { return hexToBin(BESO_HEX.replace("@@@@@@@@", hex4(w) + hex4(h))); }

        var TDB4_ROOT = hexToBin("db9900010001000000010000000078003f1a36e2eb1c432d3ff00000000000003ff00000000000003ff00000000000003ff0000000000000" + zerosHex(68));
        var TDB4_BOOL = hexToBin("db9900010001000000010004000078003f1a36e2eb1c432d3ff00000000000003ff00000000000003ff00000000000003ff0000000000000" + zerosHex(68));
        var TDB4_SCAL = hexToBin("db99000100010000ffff00ff00007800" + zerosHex(108));

        // ---- pard: one control definition, 148 bytes at fixed offsets ----
        //   12  type          16  name (32 bytes)   48  group flag   56  default
        //  104  valid min    108  valid max        112  slider min  116  slider max
        //  120  default as f32                     124  precision   126  percent flag
        // popup only (u16 each, decoded from real .ffx files -- see README):
        //   58  current item  60  item count       62  default item

        var TYPE_CHECKBOX = 4, TYPE_POPUP = 7, TYPE_SLIDER = 10;

        function pardFor(c) {
            var b = new Buf(148);
            var nm = (c.name || "").substr(0, 31);

            if (c.type === "slider") {
                var smn = (c.min === undefined) ? 0 : c.min;
                var smx = (c.max === undefined) ? 100 : c.max;
                b.put(12, u32(TYPE_SLIDER));
                b.put(16, nm);
                b.put(56, f64(c.value));
                b.put(104, f32(smn));
                b.put(108, f32(smx));
                b.put(112, f32(c.sliderMin === undefined ? smn : c.sliderMin));
                b.put(116, f32(c.sliderMax === undefined ? smx : c.sliderMax));
                b.put(120, f32(c.value));
                b.put(124, u16(c.precision === undefined ? 1 : c.precision));
                b.put(126, u16(c.percent ? 1 : 0));

            } else if (c.type === "checkbox") {
                b.put(12, u32(TYPE_CHECKBOX));
                b.put(16, nm);
                b.put(56, u32(c.value ? 1 : 0));
                b.put(60, u8(c.value ? 1 : 0));

            } else if (c.type === "popup") {
                b.put(12, u32(TYPE_POPUP));
                b.put(16, nm);
                b.put(58, u16(c.value));
                b.put(60, u16(c.options.length));
                b.put(62, u16(c.value));

            } else {
                throw new Error("Unsupported control type: " + c.type);
            }

            var out = chunk("pard", b.str());
            // pdnm carries the checkbox label, or the popup's items joined by "|".
            if (c.type === "checkbox") { out += utfChunk("pdnm", c.label || ""); }
            if (c.type === "popup") { out += utfChunk("pdnm", c.options.join("|")); }
            return out;
        }

        // Root node of the effect, and the built-in parameters node AE expects.
        function pardRoot() {
            var b = new Buf(148);
            b.put(48, u32(2));
            b.put(128, hexToBin("ffffffff"));
            return chunk("pard", b.str());
        }
        function pardBuiltIn() {
            var b = new Buf(148);
            b.put(12, u32(9));
            return chunk("pard", b.str());
        }

        // ---- tdbs: the value of one control on the applied instance ----

        function tdbsFor(c) {
            var body = chunk("tdsb", u32(1)) + utfChunk("tdsn", c.name || "-_0_/-");

            if (c.type === "checkbox") {
                body += chunk("tdb4", TDB4_BOOL) + chunk("cdat", f64(c.value ? 1 : 0) + zeros(32));

            } else if (c.type === "popup") {
                // Same integer-valued block as a checkbox, holding the 1-based index.
                body += chunk("tdb4", TDB4_BOOL) + chunk("cdat", f64(c.value) + zeros(32));

            } else {
                body += chunk("tdb4", TDB4_SCAL) + chunk("cdat", f64(c.value) + zeros(32));
                // tdum / tduM hold the slider travel of the applied instance and
                // take precedence over the slider bounds declared in pard, so they
                // must carry sliderMin / sliderMax and not the valid range. The
                // valid range stays in pard at offsets 104 / 108, which is what
                // keeps a value beyond the travel typable in the field.
                var trvMin = (c.sliderMin === undefined) ? (c.min === undefined ? 0 : c.min) : c.sliderMin;
                var trvMax = (c.sliderMax === undefined) ? (c.max === undefined ? 100 : c.max) : c.sliderMax;
                body += chunk("tdum", f64(trvMin));
                body += chunk("tduM", f64(trvMax));
            }
            return list("tdbs", body);
        }

        // Controls are addressed as "Pseudo/<id>-0001", "-0002", and so on.
        function pad4(i) { var s = "000" + i; return s.substr(s.length - 4); }

        // ---- full preset ----

        function buildFFX(fx, refW, refH) {
            var mn = "Pseudo/" + fx.id;
            var ctrls = fx.controls;
            var i;

            // definition
            var parT = chunk("parn", u32(ctrls.length + 2));
            parT += tdmn(mn + "-0000") + pardRoot();
            for (i = 0; i < ctrls.length; i++) {
                parT += tdmn(mn + "-" + pad4(i + 1)) + pardFor(ctrls[i]);
            }
            parT += tdmn("ADBE Effect Built In Params") + pardBuiltIn();

            // values
            var vals = chunk("tdsb", u32(1)) + utfChunk("tdsn", fx.name);
            vals += tdmn(mn + "-0000");
            vals += list("tdbs", chunk("tdsb", u32(1)) + utfChunk("tdsn", "-_0_/-") +
                         chunk("tdb4", TDB4_ROOT) + chunk("cdat", zeros(40)) +
                         chunk("tdpi", u32(0)) + chunk("tdps", u32(0)));
            for (i = 0; i < ctrls.length; i++) {
                vals += tdmn(mn + "-" + pad4(i + 1)) + tdbsFor(ctrls[i]);
            }

            // compositing options, which every effect instance carries
            var copts = chunk("tdsb", u32(1)) + utfChunk("tdsn", "Compositing Options");
            copts += tdmn("ADBE Effect Mask Parade");
            copts += list("tdgp", chunk("tdsb", u32(1)) + utfChunk("tdsn", "-_0_/-") + tdmn("ADBE Group End"));
            copts += tdmn("ADBE Effect Mask Opacity");
            copts += list("tdbs", chunk("tdsb", u32(1)) + utfChunk("tdsn", "-_0_/-") +
                          chunk("tdb4", TDB4_SCAL) + chunk("cdat", f64(100) + zeros(32)) +
                          chunk("tdum", f64(0)) + chunk("tduM", f64(100)));
            copts += tdmn("ADBE Group End");
            vals += tdmn("ADBE Effect Built In Params") + list("tdgp", copts);
            vals += tdmn("ADBE Group End");

            var sspc = utfChunk("fnam", "") + list("parT", parT) + list("tdgp", vals);
            sspc += chunk("pgui", zeros(16)) + chunk("elab", u8(255));

            var besc = chunk("beso", beso(refW, refH));
            // A two-step destination path, "effect parade -> instance", appends the
            // effect. A one-step path pointing at the parade itself would mean
            // "replace the whole effect list" and would silently wipe the effects
            // already on the layer.
            besc += list("tdsp", chunk("tdot", hexToBin("ffffffff")) + chunk("tdpl", u32(2)) +
                         list("tdsi", chunk("tdix", hexToBin("ffffffff")) + tdmn("ADBE Effect Parade")) +
                         list("tdsi", chunk("tdix", u32(0)) + tdmn(mn)));
            besc += utfChunk("tdsn", fx.name);
            besc += list("tdsp", chunk("tdot", hexToBin("ffffffff")) + chunk("tdpl", u32(1)) +
                         list("tdsi", chunk("tdix", hexToBin("ffffffff")) + tdmn("ADBE End of path sentinel")));
            besc += list("sspc", sspc);

            var payload = "FaFX" + chunk("head", HEAD) + list("besc", besc);
            return "RIFX" + u32(payload.length) + payload;
        }

        // ---- public API ----

        // Builds the preset for fx, applies it to one layer and returns the
        // applied effect (still carrying its default name, fx.name).
        function applyTo(layer, fx) {
            var comp = layer.containingComp;

            var file = new File(Folder.temp.fsName + "/_pfx_" + fx.id + ".ffx");
            file.encoding = "BINARY";
            file.open("w");
            file.write(buildFFX(fx, comp.width, comp.height));
            file.close();

            // applyPreset acts on the SELECTION, not on the layer it is called on.
            // Isolate the target, apply, then restore the previous selection.
            var sel = comp.selectedLayers;
            var i;
            for (i = 0; i < sel.length; i++) { sel[i].selected = false; }
            layer.selected = true;
            layer.applyPreset(file);
            layer.selected = false;
            for (i = 0; i < sel.length; i++) { sel[i].selected = true; }

            file.remove();

            // applyPreset appends to the effect parade, so the new effect is
            // the last one. Check its matchName rather than trust that blindly.
            var parade = layer.property("ADBE Effect Parade");
            var applied = parade.property(parade.numProperties);
            if (!applied || applied.matchName !== "Pseudo/" + fx.id) {
                throw new Error("PseudoFX: could not find the applied \"" + fx.name + "\" effect on layer \"" + layer.name + "\".");
            }
            return applied;
        }

        // Throwaway id, used only when DEV_MODE is on.
        function devId() { return 900000 + ((new Date()).getTime() % 99999); }

        return { build: buildFFX, applyTo: applyTo, devId: devId };
    })();

    // Springs and Bounces pseudo effect specs.
    //
    // Every value below -- default, min/max, sliderMin/sliderMax, precision --
    // can be freely edited: change a number, save, reopen the panel (no
    // reinstall, no export/import round-trip through Pseudo Effect Maker).
    // What must NOT change on a shipped effect: the order of "controls", or
    // removing/inserting one, without ALSO giving the effect a new "id" --
    // controls are addressed by position (-0001, -0002, ...), and the id
    // names that exact layout. See "THE id FIELD" above.
    //
    // DEV_MODE: After Effects caches a pseudo-effect's definition (including
    // every control's bounds) for the whole session, the first time it sees
    // a given id. So a normal edit -- widening a slider's range, tweaking a
    // default -- needs a restart of After Effects to actually show up.
    // Setting DEV_MODE to true works around that while iterating: applySprings()/
    // applyBounces() then apply a throwaway id on every run, so AE always treats
    // it as a brand-new effect and immediately reflects the current file.
    // Expressions keep working (they resolve by name, e.g.
    // effect("Springs")("Amplitude"), never by id). Turn DEV_MODE back off
    // before using the tool for real work: with it on, every application
    // gets its own one-off effect definition, so a project saved in this
    // state accumulates one throwaway effect per application instead of
    // reusing the same "Springs"/"Bounces" effect everywhere.
    var DEV_MODE = false;

    var FX_SPRINGS = {

        name: "Springs",
        id: 770127,   // bound to the control layout below -- see "THE id FIELD"

        controls: [

            // 1 = Enable, 2 = Disable. Read by the expression as an index.
            { type: "popup", name: "Expression", value: 1,
              options: ["Enable", "Disable"] },

            { type: "slider", name: "Amplitude", value: 5, min: 0, max: 100,
              sliderMin: 0, sliderMax: 10, precision: 1 },

            { type: "slider", name: "Frequency", value: 5, min: 0.01, max: 1000,
              sliderMin: 0.01, sliderMax: 10, precision: 1 },

            { type: "slider", name: "Number of springs", value: 5, min: 0, max: 1000,
              sliderMin: 0, sliderMax: 10, precision: 1 },

            { type: "slider", name: "Extra damping", value: 1, min: 1, max: 10000,
              sliderMin: 1, sliderMax: 5, precision: 2 },

            { type: "checkbox", name: "Rebounds", value: false }

        ]
    };

    var FX_BOUNCES = {

        name: "Bounces",
        id: 770128,   // bound to the control layout below -- see "THE id FIELD"

        controls: [

            // 1 = Enable, 2 = Disable. Read by the expression as an index.
            { type: "popup", name: "Expression", value: 1,
              options: ["Enable", "Disable"] },

            { type: "slider", name: "First bounce duration (f)", value: 12, min: 0, max: 1000,
              sliderMin: 3, sliderMax: 50, precision: 0 },

            { type: "slider", name: "Damping", value: 20, min: 0.1, max: 100,
              sliderMin: 0.1, sliderMax: 100, precision: 1, percent: true },

            { type: "slider", name: "Amplitude", value: 1, min: 0, max: 10,
              sliderMin: 0, sliderMax: 2, precision: 2 }

        ]
    };

    // Whether the expressions' velocityAtTime() means anything on this
    // property: a numeric 1D/2D/3D value that can actually move between
    // keyframes. Groups and non-numeric values fall out on the value type;
    // dropdown menus and checkboxes don't -- they report OneD like Opacity
    // does -- but they only ever take HOLD keyframes, and only
    // isInterpolationTypeValid(BEZIER) tells them apart. Orientation is
    // numeric too, but interpolates as one shortest-arc rotation, so its
    // velocity can't be added back onto the value.
    function canPropertyUseVelocity(prop) {
        if (!prop || !prop.canSetExpression) {
            return false;
        }
        if (prop.matchName === "ADBE Orientation") return false;
        if (!prop.isInterpolationTypeValid(KeyframeInterpolationType.BEZIER)) return false;
        var vType = prop.propertyValueType;
        switch (vType) {
            case PropertyValueType.OneD:
            case PropertyValueType.TwoD:
            case PropertyValueType.ThreeD:
            case PropertyValueType.TwoD_SPATIAL:
            case PropertyValueType.ThreeD_SPATIAL:
                return true;
            default:
                return false;
        }
    }

    function getPropertyLayer(prop) {// Get the layer that the property belongs to, or return null if it doesn't belong to a layer
        try {
            return prop.propertyGroup(prop.propertyDepth);
        } catch (err) {
            return null;
        }
    }

    // Collects the selected properties that can use velocity, grouped by the
    // layer they belong to (one group per layer, in selection order), and
    // flags whether a control layer is required (camera, light and 3D model
    // layers can't host a pseudo-effect).
    function collectProperties(comp) {
        var selectedProps = comp.selectedProperties;
        var validProps = [];
        var groups = [];
        var needsControlLayer = false;

        for (var i = 0; i < selectedProps.length; i++) {
            var prop = selectedProps[i];
            if (!canPropertyUseVelocity(prop)) {
                continue;
            }
            // An expression that isn't ours is someone else's work: skip the
            // property silently, like one that can't take the expression.
            if (prop.expression !== "" && !parseExpression(prop.expression)) {
                continue;
            }

            var layer = getPropertyLayer(prop);
            if (!layer) {
                continue;
            }

            validProps.push(prop);

            var group = null;
            for (var j = 0; j < groups.length; j++) {
                if (groups[j].layer.index === layer.index) {
                    group = groups[j];
                    break;
                }
            }

            if (!group) {
                group = { layer: layer, properties: [] };
                groups.push(group);
                if (layer instanceof CameraLayer || layer instanceof LightLayer || layer instanceof ThreeDModelLayer || layer.matchName === "ADBE3D ParametricMeshLayer") {
                    needsControlLayer = true;
                }
            }
            group.properties.push(prop);
        }

        return {
            properties: validProps,
            groups: groups,
            needsControlLayer: needsControlLayer
        };
    }

    // ---- the Control Layer ----
    // A hidden shape layer named CONTROL_LAYER_NAME that hosts the pseudo-
    // effects for layers that can't carry one (cameras, lights, 3D models),
    // or for everything when the button was Ctrl/Cmd-clicked. Found by
    // name, so one comp has at most one.
    var CONTROL_LAYER_NAME = "Control Layer";

    function findControlLayer(comp) {
        try {
            return comp.layer(CONTROL_LAYER_NAME) || null;
        } catch (err) {
            return null;
        }
    }

    function getOrCreateControlLayer(comp) {
        var ctrlLayer = findControlLayer(comp);
        if (!ctrlLayer) {
            ctrlLayer = comp.layers.addShape();
            ctrlLayer.name = CONTROL_LAYER_NAME;
            ctrlLayer.enabled = false;
        }
        return ctrlLayer;
    }

    // ---- effect naming ----
    // Each application gets its own, uniquely named pseudo-effect, and each
    // expression targets that exact name -- so the same effect can be applied
    // several times on one layer (or many times on the Control Layer) without
    // every expression collapsing onto the first "Springs".
    //
    //   1 to MAX_NAMED_PROPS properties  ->  "Springs - Position, Scale"
    //   more than that                   ->  "Springs 1", "Springs 2", ...
    //
    // A name already taken on the host layer gets the next free number
    // appended ("Springs - Position 2").
    var MAX_NAMED_PROPS = 3;

    // "Position, Scale", "Ball > Position, Scale, Rotation" or
    // "Position, Slider Control > Slider, Angle": each property is preceded
    // by where it lives -- the source layer on the Control Layer (where the
    // property alone would not say which layer it drives), and the effect
    // for an effect parameter -- but a layer or effect already named for the
    // previous property is not repeated.
    function propertiesLabel(props, withLayer) {
        var out = "";
        var lastLayer = null, lastEffect = null;
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            var layerName = withLayer ? getPropertyLayer(prop).name : "";
            var parent = prop.parentProperty;
            var effectName = (parent && parent.isEffect) ? parent.name : "";

            if (i > 0) { out += ", "; }
            // Leaving an effect for a plain property re-states the layer, so
            // the property doesn't read as belonging to that effect.
            if (layerName !== lastLayer || (effectName === "" && lastEffect !== "")) {
                if (layerName !== "") { out += layerName + " > "; }
                lastLayer = layerName;
                lastEffect = null;
            }
            if (effectName !== lastEffect) {
                if (effectName !== "") { out += effectName + " > "; }
                lastEffect = effectName;
            }
            out += prop.name;
        }
        return out;
    }

    function findEffect(layer, name) {
        var parade = layer.property("ADBE Effect Parade");
        for (var i = 1; i <= parade.numProperties; i++) {
            if (parade.property(i).name === name) { return parade.property(i); }
        }
        return null;
    }

    // Picks the name of the pseudo-effect hosting these properties. keepName
    // is the current name of the effect being renamed, which stays available
    // to it (pass undefined for a new effect).
    function effectNameFor(baseName, host, props, withLayer, keepName) {
        function taken(name) { return name !== keepName && findEffect(host, name) !== null; }
        var base, n;
        if (props.length <= MAX_NAMED_PROPS) {
            base = baseName + " - " + propertiesLabel(props, withLayer);
            if (!taken(base)) { return base; }
            n = 2;
        } else {
            base = baseName;
            n = 1;
        }
        while (taken(base + " " + n)) { n++; }
        return base + " " + n;
    }

    // "Springs" from "Springs - Position 2" or "Springs 3".
    function effectBaseName(effectName) {
        return effectName.replace(/ - [\s\S]*$/, "").replace(/ \d+$/, "");
    }

    // Escapes a name for use inside a double-quoted expression string literal.
    function jsString(str) {
        return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    }

    // The two lines every expression written by this script starts with.
    function expressionPreamble(onControlLayer, effectName) {
        return (onControlLayer
            ? 'const layerCtrl = thisComp.layer("' + CONTROL_LAYER_NAME + '");'
            : 'const layerCtrl = thisLayer;') + "\n" +
            'const pseudoFx = layerCtrl.effect("' + jsString(effectName) + '");';
    }

    // Recognises that preamble and reads back where the controller lives.
    // Anything else is not ours and is left alone. The layer name in the
    // pattern is CONTROL_LAYER_NAME, spelled out because this is a literal.
    var PREAMBLE_RE = /^const layerCtrl = (thisLayer|thisComp\.layer\("Control Layer"\));\s*\nconst pseudoFx = layerCtrl\.effect\("((?:[^"\\]|\\.)*)"\);/;

    function parseExpression(expression) {
        var m = PREAMBLE_RE.exec(expression || "");
        if (!m) { return null; }
        return {
            onControlLayer: (m[1] !== "thisLayer"),
            effectName: m[2].replace(/\\(.)/g, "$1"),
            preambleLength: m[0].length
        };
    }

    // ---- stale property references ----
    // Adding an effect to a layer rebuilds its effect parade, and every
    // Property object already held for a parameter of that layer's effects
    // becomes invalid ("Objet non valide" on the next access). Transform
    // properties survive, effect parameters don't. So the properties to
    // animate are recorded as index paths from their layer before the
    // pseudo-effect is applied, and resolved again afterwards. Appending an
    // effect doesn't shift the indices of the effects already there.
    function propertyPath(prop) {
        var path = [];
        var p = prop;
        while (p.propertyDepth > 0) {   // depth 0 is the layer itself
            path.unshift(p.propertyIndex);
            p = p.parentProperty;
        }
        return { layer: p, path: path };
    }

    function propertyPaths(props) {
        var refs = [];
        for (var i = 0; i < props.length; i++) { refs.push(propertyPath(props[i])); }
        return refs;
    }

    function resolvePropertyPath(ref) {
        var p = ref.layer;
        for (var i = 0; i < ref.path.length; i++) {
            p = p.property(ref.path[i]);
        }
        return p;
    }

    // Shared apply step for both effects: collects the selected properties,
    // applies one uniquely named pseudo-effect per host layer (each
    // property's own layer, or a single one on the shared "Control Layer"),
    // then writes the expression on every property. The generated preamble
    // binds layerCtrl and pseudoFx, so "body" starts right after that and
    // reads its controls through pseudoFx("...").
    // options: { controlLayer, perProperty } from clickOptions().
    function applyFollowThrough(fx, body, options) {
        if (!(app.project.activeItem instanceof CompItem)) { return; }
        var comp = app.project.activeItem;

        var selectedData = collectProperties(comp);
        if (selectedData.properties.length === 0) { return; }

        if (DEV_MODE) { fx.id = PseudoFX.devId(); }

        var useControlLayer = options.controlLayer || selectedData.needsControlLayer;

        app.beginUndoGroup(fx.name);
        try {
            // Properties already driven by this script are detached from
            // their current controller first (renamed, or marked for
            // deletion once the new effects are in place), so re-applying
            // never leaves an orphaned effect behind.
            var detached = detachFromControllers(comp, selectedDrivenProperties(comp));

            // One target = one pseudo-effect + the properties it drives:
            // one per layer (or a single one on the Control Layer), or one
            // per property when the click asked for it. Properties are kept
            // as index paths, not objects: applying a target's effect can
            // invalidate the next target's properties when they share the
            // host layer (see propertyPath).
            var targets = [];
            var groups = selectedData.groups;
            var g, i;
            if (options.perProperty) {
                var ctrlLayer = useControlLayer ? getOrCreateControlLayer(comp) : null;
                for (g = 0; g < groups.length; g++) {
                    for (i = 0; i < groups[g].properties.length; i++) {
                        targets.push({ host: ctrlLayer || groups[g].layer,
                                       refs: [propertyPath(groups[g].properties[i])] });
                    }
                }
            } else if (useControlLayer) {
                targets.push({ host: getOrCreateControlLayer(comp), refs: propertyPaths(selectedData.properties) });
            } else {
                for (g = 0; g < groups.length; g++) {
                    targets.push({ host: groups[g].layer, refs: propertyPaths(groups[g].properties) });
                }
            }

            for (var t = 0; t < targets.length; t++) {
                var host = targets[t].host;
                var refs = targets[t].refs;
                var p;

                // Fresh property objects, read before the effect is applied.
                var props = [];
                for (p = 0; p < refs.length; p++) {
                    props.push(resolvePropertyPath(refs[p]));
                }
                var name = effectNameFor(fx.name, host, props, useControlLayer);

                var applied = PseudoFX.applyTo(host, fx);
                applied.name = name;

                // And fresh again afterwards, since that application may
                // have invalidated them.
                var expression = expressionPreamble(useControlLayer, name) + "\n" + body;
                for (p = 0; p < refs.length; p++) {
                    resolvePropertyPath(refs[p]).expression = expression;
                }
            }

            finishDetach(comp, detached);
        } finally {
            app.endUndoGroup();
        }
    }

    function applySprings(options) {
        var body = [
            '',
            'const isOff = pseudoFx("Expression") == 2;   // 1 = Enable, 2 = Disable',
            'const amp = pseudoFx("Amplitude") / 100;',
            'const freq = pseudoFx("Frequency");',
            'const num = pseudoFx("Number of springs");',
            'const dec = pseudoFx("Extra damping");',
            'const reb = pseudoFx("Rebounds");',
            '',
            'if (isOff || numKeys < 2 || time < key(2).time) {',
            '    value;',
            '} else {',
            '    const timePrevKey = previousKey(time).time;',
            '    const isStationary = (length(velocityAtTime(time)) === 0);',
            '    const dur = num / freq;',
            '    if (isStationary && dur > 0 && time <= (timePrevKey + dur)) {',
            '        const rad = num * 2 * Math.PI / dur;',
            '        const fal = easeOut(time, timePrevKey, timePrevKey + dur, 1, 0);',
            '        let sin = Math.sin((time - timePrevKey) * rad);',
            // reb is a Property object, truthy whatever the checkbox holds;
            // "== true" is what coerces it to its value. Keep it.
            '        if (reb == true) {',
            '            sin = -Math.abs(sin);',
            '        }',
            '        const velOut = velocityAtTime(timePrevKey - 0.001);',
            '        value + mul(velOut, sin * Math.pow(fal, dec) * amp);',
            '    } else {',
            '        value;',
            '    }',
            '}'
        ].join('\n');

        applyFollowThrough(FX_SPRINGS, body, options);
    }

    function applyBounces(options) {
        var body = [
            '',
            'const isOff = pseudoFx("Expression") == 2;   // 1 = Enable, 2 = Disable',
            'const firstBounce = Math.ceil(pseudoFx("First bounce duration (f)"));',
            'const damp = pseudoFx("Damping") / 100;',
            'const ampMult = pseudoFx("Amplitude");',
            '',
            'if (isOff || numKeys < 2 || time < key(2).time) {',
            '    value;',
            '} else {',
            '    const frDur = thisComp.frameDuration;',
            '    let timePrevKey = previousKey(time).time;',
            '    const isStationary = (length(velocityAtTime(time)) === 0);',
            '',
            '    let bounceDurations = [firstBounce];',
            '    let totalDur = firstBounce * frDur;',
            '    let nextBounce = firstBounce;',
            '    while (nextBounce > 2) {',
            '        nextBounce -= Math.ceil(nextBounce * damp);',
            '        bounceDurations.push(nextBounce);',
            '        totalDur += nextBounce * frDur;',
            '    }',
            '    if (isStationary && time < timePrevKey + totalDur) {',
            '        const velOut = velocityAtTime(timePrevKey - 0.001);',
            '        let bounceOffset = value * 0;',
            '        for (let d of bounceDurations) {',
            '            const curDur = d * frDur;',
            '            if (time < timePrevKey + curDur) {',
            '                const t = time - timePrevKey;',
            '                const fall = ampMult * (curDur * t - Math.pow(t, 2));',
            '                bounceOffset = mul(velOut, fall);',
            '                break;',
            '            } else {',
            '                timePrevKey += curDur;',
            '            }',
            '        }',
            '        value - bounceOffset;',
            '    } else {',
            '        value;',
            '    }',
            '}'
        ].join('\n');

        applyFollowThrough(FX_BOUNCES, body, options);
    }

    // ---- removal ----

    // Every property under root (a layer or a property group) whose
    // expression targets the controller named effectName, hosted as told
    // by onControlLayer.
    function collectControllerUsers(root, effectName, onControlLayer, out) {
        for (var i = 1; i <= root.numProperties; i++) {
            var p = root.property(i);
            if (p.propertyType !== PropertyType.PROPERTY) {
                collectControllerUsers(p, effectName, onControlLayer, out);
                continue;
            }
            if (!p.canSetExpression || p.expression === "") { continue; }
            var parsed = parseExpression(p.expression);
            if (parsed && parsed.effectName === effectName && parsed.onControlLayer === onControlLayer) {
                out.push(p);
            }
        }
    }

    // Detaches these properties from the controllers their expressions point
    // to: clears the expressions, renames each controller still used by other
    // properties after those, and marks the orphaned ones for deletion. The
    // deletion itself is left to finishDetach(), because removing an effect
    // invalidates every property reference into its layer and drops the
    // property selection -- so nothing is deleted while a caller may still
    // need its property objects. Every property must carry an expression
    // written by this script. Must run inside an undo group.
    function detachFromControllers(comp, props) {
        var i, c;

        // 1. Which controllers are involved (each once).
        var controllers = [];
        for (i = 0; i < props.length; i++) {
            var parsed = parseExpression(props[i].expression);
            var host = parsed.onControlLayer ? findControlLayer(comp) : getPropertyLayer(props[i]);
            if (!host) { continue; }
            var known = false;
            for (c = 0; c < controllers.length; c++) {
                if (controllers[c].host.index === host.index && controllers[c].name === parsed.effectName) { known = true; break; }
            }
            if (!known) {
                controllers.push({ host: host, name: parsed.effectName, onControlLayer: parsed.onControlLayer });
            }
        }

        // 2. Clear the expressions.
        for (i = 0; i < props.length; i++) {
            props[i].expression = "";
        }

        // 3. Each controller: orphaned ones get a throwaway name (freeing
        //    their real name for whatever gets applied next) and are listed
        //    for finishDetach(); the others are renamed after their users.
        var doomed = [];
        var touchedControlLayer = false;
        for (c = 0; c < controllers.length; c++) {
            var ctrl = controllers[c];
            var fx = findEffect(ctrl.host, ctrl.name);
            if (!fx) { continue; }
            if (ctrl.onControlLayer) { touchedControlLayer = true; }

            var users = [];
            if (ctrl.onControlLayer) {
                for (var l = 1; l <= comp.numLayers; l++) {
                    collectControllerUsers(comp.layer(l), ctrl.name, true, users);
                }
            } else {
                collectControllerUsers(ctrl.host, ctrl.name, false, users);
            }

            if (users.length === 0) {
                fx.name = "__removing__" + doomed.length;
                doomed.push({ host: ctrl.host, name: fx.name });
                continue;
            }

            var newName = effectNameFor(effectBaseName(ctrl.name), ctrl.host, users, ctrl.onControlLayer, ctrl.name);
            if (newName === ctrl.name) { continue; }
            fx.name = newName;
            for (var u = 0; u < users.length; u++) {
                var expr = users[u].expression;
                var body = expr.substr(parseExpression(expr).preambleLength);
                users[u].expression = expressionPreamble(ctrl.onControlLayer, newName) + body;
            }
        }

        return { doomed: doomed, touchedControlLayer: touchedControlLayer };
    }

    // Second half of a detach: deletes the orphaned controllers, then drops
    // a Control Layer left with nothing on it (no effect, no shape content
    // -- the one this script created). Call it once nothing else needs a
    // property reference into the layers involved.
    function finishDetach(comp, detached) {
        for (var d = 0; d < detached.doomed.length; d++) {
            var fx = findEffect(detached.doomed[d].host, detached.doomed[d].name);
            if (fx) { fx.remove(); }
        }
        if (detached.touchedControlLayer) {
            var ctrlLayer = findControlLayer(comp);
            if (ctrlLayer && ctrlLayer instanceof ShapeLayer &&
                ctrlLayer.property("ADBE Effect Parade").numProperties === 0 &&
                ctrlLayer.property("ADBE Root Vectors Group").numProperties === 0) {
                ctrlLayer.remove();
            }
        }
    }

    // The selected properties carrying an expression written by this script.
    function selectedDrivenProperties(comp) {
        var selected = comp.selectedProperties;
        var out = [];
        for (var i = 0; i < selected.length; i++) {
            if (selected[i].canSetExpression && parseExpression(selected[i].expression)) {
                out.push(selected[i]);
            }
        }
        return out;
    }

    // Remove button: undoes the script's work on the selected properties.
    // Properties with any other expression, or none, are left untouched.
    function removeFollowThrough() {
        if (!(app.project.activeItem instanceof CompItem)) { return; }
        var comp = app.project.activeItem;

        var props = selectedDrivenProperties(comp);
        if (props.length === 0) { return; }

        app.beginUndoGroup("Remove Springs / Bounces");
        try {
            finishDetach(comp, detachFromControllers(comp, props));
        } finally {
            app.endUndoGroup();
        }
    }

    // ---- user guide ----
    // The "?" button. Kept short on purpose: the header of this file is the
    // full reference.
    function showHelp() {
        var paragraphs = [
            "Select keyframed properties, then click:",

            "SPRINGS \u2014 the property overshoots where it arrives and oscillates " +
            "around it, like the end of a spring.",

            "BOUNCES \u2014 it bounces off where it arrives like a ball, each bounce " +
            "shorter than the one before. Every contact lands exactly on a frame.",

            "REMOVE \u2014 takes it all away from the selected properties.",

            "Each click adds an expression to the properties and a pseudo-effect " +
            "(the controller) to their layer, named after what it drives. Tune the " +
            "animation there; its \"Expression\" menu switches it off and on.",

            CTRL_LABEL + "-click Springs or Bounces to put the controller on a shared " +
            "\"Control Layer\" instead, and drive every spring and bounce of the comp " +
            "from one place. Cameras, lights and 3D models always use it.",

            ALT_LABEL + "-click to get one controller per selected property instead of " +
            "one for all of them. Both keys can be combined.",

            "The animation comes from your keyframes: it plays after a move ends, " +
            "with the speed the property arrived at. It needs two keyframes, and only " +
            "numeric properties (position, scale, rotation, sliders...) take it. " +
            "Anything else, and any property carrying an expression of its own, is " +
            "left untouched."
        ];

        var dlg = new Window("dialog", "Springs or Bounces");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = 16;
        dlg.spacing = 10;

        // One control for the whole text, sized from a real measurement:
        // ScriptUI over-estimates a multiline statictext's height (badly so
        // when there is one control per paragraph, where the gaps pile up),
        // and measureString() with a bounding width gives the wrapped height.
        var HELP_WIDTH = 460;
        var text = paragraphs.join("\n\n");
        var body = dlg.add("statictext", undefined, text, { multiline: true });
        var height = 0;
        try {
            height = body.graphics.measureString(text, body.graphics.font, HELP_WIDTH)[1];
        } catch (e) {}
        if (height > 0) {
            body.preferredSize = [HELP_WIDTH, height + 4];
        } else {
            body.preferredSize.width = HELP_WIDTH;
        }

        var ok = dlg.add("button", undefined, "OK", { name: "ok" });
        ok.alignment = ["right", "bottom"];

        dlg.center();
        dlg.show();
    }

    function clearPanel(container) {// Remove all children from a container, to clear the panel before rebuilding it
        while (container.children.length > 0) {
            container.remove(container.children[0]);
        }
    }

    function buildMainPanel() {// Build the main panel: the Springs, Bounces, Remove and help buttons
        clearPanel(panel);

        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 8;
        panel.margins = 10;

        // The button strip is a row, and flips to a column when the panel is
        // taller than it is wide (docked in a side column) -- see
        // reOrientButtons below, same technique as Speed7.
        var btnGroup = panel.add("group", undefined);
        btnGroup.orientation = "row";
        btnGroup.alignChildren = ["left", "top"];
        btnGroup.alignment = ["left", "top"];

        var ctrlLayerHint = " " + CTRL_LABEL + "-click: controller on the shared Control Layer. " + ALT_LABEL + "-click: one controller per property.";
        var btnSprings = addSvgButton(btnGroup, SVG_SPRING_CMDS, SVG_SPRING_W, SVG_SPRING_H, 24, "Add a spring animation to the selected properties." + ctrlLayerHint);
        var btnBounces = addSvgButton(btnGroup, SVG_BOUNCE_CMDS, SVG_BOUNCE_W, SVG_BOUNCE_H, 24, "Add a bounce animation to the selected properties." + ctrlLayerHint);
        var btnRemove = addSvgButton(btnGroup, SVG_TRASH_CMDS, SVG_TRASH_W, SVG_TRASH_H, 5, "Remove the spring or bounce from the selected properties: clears their expression and deletes the controller, or renames it if other properties still use it.");
        var btnHelp = addSvgButton(btnGroup, SVG_HELP_CMDS, SVG_HELP_W, SVG_HELP_H, 6, "How this panel works.");

        btnSprings.onClick = function (event) {
            applySprings(clickOptions(event));
        };

        btnBounces.onClick = function (event) {
            applyBounces(clickOptions(event));
        };

        btnRemove.onClick = function () {
            removeFollowThrough();
        };

        btnHelp.onClick = function () {
            showHelp();
        };

        function reOrientButtons() {
            var width = 0, height = 0;
            if (panel.windowBounds) {
                width  = panel.windowBounds.width;
                height = panel.windowBounds.height;
            }
            if ((!width || !height) && panel.size) {
                width  = panel.size[0];
                height = panel.size[1];
            }
            btnGroup.orientation = (height > width) ? "column" : "row";
            panel.layout.layout(true);
            panel.layout.resize();
        }

        panel.layout.layout(true);
        reOrientButtons();
        panel.onResizing = panel.onResize = reOrientButtons;
    }

    function buildAccessPanel() {// Build the panel that prompts the user to enable the preference to allow scripts to write files, with buttons to open the preferences and check again
        clearPanel(panel);

        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 8;
        panel.margins = 10;

        var message = 'To use Springs or Bounces, enable the "Allow Scripts to Write Files and Access Network" option in After Effects preferences.';
        var infoText = panel.add("statictext", undefined, message, { multiline: true });
        infoText.preferredSize.width = 260;

        var buttonRow = panel.add("group");
        buttonRow.orientation = "row";
        buttonRow.alignChildren = ["fill", "center"];
        buttonRow.spacing = 4;

        var openPrefsButton = buttonRow.add("button", undefined, "Open preferences");
        var relaunchButton = buttonRow.add("button", undefined, "Check again");

        openPrefsButton.onClick = function () {
            app.executeCommand(3216);
        };

        // buildMainPanel installs its own resize handler; restore the plain one.
        panel.onResizing = panel.onResize = function () { this.layout.resize(); };

        relaunchButton.onClick = function () {
            if (typeof app.scheduleTask === "function") {
                $.global.__springsOrBouncesRebuildPanel = rebuildPanel;
                app.scheduleTask("$.global.__springsOrBouncesRebuildPanel();", 50, false);
            } else {
                rebuildPanel();
            }
        };

        panel.layout.layout(true);
        panel.layout.resize();
    }

    function rebuildPanel() {// Rebuild the panel based on whether the script has access to write files, which is necessary for generating the preset files. If it has access, build the main panel, otherwise build the access panel with instructions.
        if (hasWriteFilesAccess()) {
            buildMainPanel();
        } else {
            buildAccessPanel();
        }
    }

    // Main
    var panel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Springs or Bounces", undefined, { resizeable: true });
    panel.onResizing = panel.onResize = function () { this.layout.resize(); };

    rebuildPanel();

    if (panel instanceof Window) {
        panel.center();
        panel.show();
    }

})(this);
