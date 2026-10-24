# Gamma & Saturation Control

A GNOME Shell extension that changes the saturation and gamma of the whole
desktop, not just of application windows.

Saturation runs from 0 % (greyscale) to 200 % and is neutral at 100 %. Gamma runs
from 0.50 to 2.50 and is neutral at 1.00. Both are adjusted from a single
preferences page and applied immediately: no restart, no background daemon, no
configuration file.

The shader is drawn once over the composited desktop, so the cost is constant no
matter how many windows are open. When both values are neutral the effect
switches itself off and the shader leaves the paint path entirely.

## Compatibility

| | |
|---|---|
| GNOME Shell | 45 – 50 |
| Tested on | 48 (Debian 13, Wayland) |
| Session | Wayland and X11 |

Versions before 45 are not supported. The extension is an ES module, and GNOME
Shell only gained ES module support in 45.

45–47 and 49–50 are declared compatible because they expose the same APIs, but
only 48 has been tested on real hardware. If something misbehaves on another
version, open an issue with your GNOME version and the output of
`gnome-extensions info gamma-saturation@mazen-harbi.github.io`.

## Installation

### extensions.gnome.org

The extension is in the submission queue. Once it is accepted it can be installed
from its page on [extensions.gnome.org](https://extensions.gnome.org).

### From a release

Download the `.shell-extension.zip` from the
[releases page](https://github.com/Mazen-Harbi/gamma-saturation-control/releases),
install it, then log out and back in:

```bash
gnome-extensions install --force gamma-saturation@mazen-harbi.github.io.shell-extension.zip
gnome-extensions enable gamma-saturation@mazen-harbi.github.io
```

The extra login is not optional. GNOME Shell only scans the extension directory
at session start, so a freshly installed extension is unknown to a running shell
— `enable` will simply answer *"does not exist"*.

### From source

```bash
git clone https://github.com/Mazen-Harbi/gamma-saturation-control.git
cd gamma-saturation-control
./install.sh                # extension only
./install.sh --with-pause   # extension + the pause shortcut (see below)
```

Then log out, log back in, and enable it with the command above.

## Usage

Open the settings from the Extensions application, or run:

```bash
gnome-extensions prefs gamma-saturation@mazen-harbi.github.io
```

**Saturation** — 100 % leaves colours alone. 120–140 % is a reasonable starting
point for a panel that looks washed out; 0 % gives a greyscale desktop.

**Gamma** — 1.00 is neutral. Raise it if the desktop looks too dark, lower it if
it looks too bright. Unlike a brightness slider this changes the mid-tones, not
the white level, so black stays black.

**Reset to defaults** — 100 % and 1.00, which also takes the effect out of the
paint path.

The settings are plain GSettings keys, so they can be scripted:

```bash
gsettings set org.gnome.shell.extensions.gamma-saturation saturation 1.35
gsettings set org.gnome.shell.extensions.gamma-saturation gamma 0.95
```

## The screenshot problem

On GNOME 48, with the effect active, a screenshot or screencast can come out
incomplete: usually the window frame is missing — the title bar and the shadow
around the window — while the rest of the image looks normal. This is a shell
bug, not an extension bug, and it is the reason the pause helper exists.

The extension skips its shader whenever it detects that it is painting into a
capture framebuffer, which handles most cases but not all of them. When it
misses, the capture has read the compositor's intermediate texture.

There are two reliable ways around it:

1. **Pause the effect.** `./install.sh --with-pause` installs
   `~/.local/bin/gamma-saturation-pause` and binds it to `Alt+9`. The script
   stores the current values, sets both to neutral, and restores them on the next
   press. It does not reload the extension or patch the shell. The shortcut
   appears in **Settings → Keyboard → Custom Shortcuts** as *"Gamma &
   Saturation Control: pause for a screenshot"*, where it can be changed or
   removed.
2. **Disable the extension** in the Extensions application, take the screenshot,
   and enable it again.

This has not been checked on GNOME 50.

## How it works

GNOME Shell composites the desktop into an offscreen texture and paints that
texture to the screen. A `Shell.GLSLEffect` attached to the top-level UI group
(`Main.layoutManager.uiGroup`) can replace that paint with its own shader, which
is why the effect covers everything at once — windows, wallpaper, top bar and
shell dialogs — rather than only the contents of application windows.

Per pixel, the shader does five things:

1. decode sRGB to linear light
2. mix the colour towards (or away from) its own luminance, using the Rec.709
   weights
3. clamp, which also keeps `pow()` away from negative values
4. encode back to sRGB
5. apply a traditional gamma curve

Steps 2 and 3 have to happen in linear light. Mixing in sRGB is the usual
shortcut, and it is what makes naive saturation filters look muddy: mid-tone
contrast drops and hues shift as the colour approaches greyscale. The luminance
values are the Rec.709 ones, which is the colour space sRGB displays actually
use.

Two details are worth mentioning because they are easy to get wrong:

* **Fullscreen windows.** A fullscreen window normally bypasses the compositor
  (unredirect), which would also bypass the shader. While the extension is
  enabled it calls `global.compositor.disable_unredirect()`, so fullscreen video
  and games get the effect too.
* **Cost when idle.** Neutral values set `enabled = false` on the effect, so the
  compositor stops redirecting into an offscreen buffer. The extension costs
  nothing until you change something.

This is not the same as a VCGT colour profile (colord / `gsd-color`). A profile
is applied by the display pipeline and never touches the compositor, so it does
not show up in screenshots — but it also cannot affect the top bar, needs colord,
and behaves differently across drivers. This extension works in the compositor,
which is both its advantage and the source of the screenshot caveat above.

## Development

```bash
./build.sh
```

This compiles the GSettings schema and writes
`dist/gamma-saturation@mazen-harbi.github.io.shell-extension.zip`, the exact
layout extensions.gnome.org expects. The archive contains only what the shell
loads:

```
metadata.json
extension.js     lifecycle: enable / disable, settings wiring
effect.js        the shader and the capture guard
prefs.js         preferences page (GTK4 / libadwaita)
schemas/         saturation and gamma keys
LICENSE
```

`install.sh` and `build.sh` are development helpers and are not shipped.

## Licence

GPL-2.0-or-later. See [LICENSE](LICENSE).

---

## نبذة بالعربية

إضافة لـ GNOME Shell تُعدِّل تشبُّع الألوان (Saturation) والجاما (Gamma) على مستوى
الشاشة بأكملها، لا على مستوى نوافذ التطبيقات وحدها؛ فتشمل الخلفية والشريط العلوي
ونوافذ النظام. تتم جميع التعديلات من صفحة إعدادات واحدة، وتُطبَّق فورًا دون إعادة
تشغيل الشل.

| | |
|---|---|
| إصدارات GNOME | 45 – 50 |
| المُختبَر عليها | 48 |
| الجلسة | Wayland و X11 |

الإصدارات الأقدم من 45 غير مدعومة، لأن الإضافة مكتوبة كوحدة ES module ولا
يدعمها الشل قبل الإصدار 45.

### التثبيت من المصدر

```bash
git clone https://github.com/Mazen-Harbi/gamma-saturation-control.git
cd gamma-saturation-control
./install.sh --with-pause
```

بعد التثبيت يلزم تسجيل الخروج والدخول مرة واحدة، لأن GNOME لا يتعرّف على
الإضافات المثبَّتة حديثًا إلا عند بدء جلسة جديدة. ثم يُنفَّذ:

```bash
gnome-extensions enable gamma-saturation@mazen-harbi.github.io
gnome-extensions prefs  gamma-saturation@mazen-harbi.github.io
```

### الإعدادات

- **التشبّع:** من 0% (تدرّج رمادي) إلى 200%، والقيمة 100% تعني عدم التغيير.
- **الجاما:** من 0.50 إلى 2.50، والقيمة 1.00 تعني عدم التغيير، وترفع القيم
  الأعلى سطوع الدرجات المتوسطة دون المساس بمستوى الأبيض.
- **إعادة الضبط:** تُعيد القيم إلى 100% و1.00، وهو ما يوقف التأثير بالكامل.

### ملاحظة حول لقطات الشاشة

في GNOME 48، وأثناء تفعيل التأثير، قد تظهر لقطة الشاشة ناقصة، وغالبًا يتمثّل
النقص في إطار النافذة أو الظل المحيط بها. السبب في مسار التقاط الشاشة داخل الشل
وليس في الإضافة. الحل المؤقت: الضغط على `Alt+9` لإيقاف التأثير مؤقتًا، ثم
أخذ اللقطة، ثم الضغط عليه مرة أخرى. يُثبِّت الأمر `./install.sh --with-pause`
هذا الاختصار، ويمكن تغييره أو حذفه من
**Settings → Keyboard → Custom Shortcuts**.

### البناء

```bash
./build.sh
```

تُنتِج الحزمة في المجلد `dist/`.

### الترخيص

GPL-2.0-or-later.
