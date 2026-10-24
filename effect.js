// SPDX-License-Identifier: GPL-2.0-or-later
//
// Gamma & Saturation Control — the shader.
//
// Every pixel goes through the same five steps:
//   1. decode sRGB to linear light
//   2. move it towards (or away from) its own luminance
//   3. clamp, which also keeps pow() away from negative values
//   4. encode back to sRGB
//   5. apply a traditional gamma curve
//
// Steps 2 and 3 run in linear light: mixing in sRGB would drop mid-tone
// contrast and shift hues, which is exactly what makes naive saturation
// filters look "muddy". The luminance weights are the Rec.709 ones used by
// sRGB displays.

import Cogl from 'gi://Cogl';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';

const DECLARATIONS = `
uniform float u_saturation;
uniform float u_gamma;

const vec3 LUMA = vec3(0.2126729, 0.7151522, 0.0721750);

vec3 srgb_to_linear(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    vec3 lo = c / 12.92;
    vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
    vec3 t = step(vec3(0.04045), c);
    return mix(lo, hi, t);
}

vec3 linear_to_srgb(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    vec3 lo = c * 12.92;
    vec3 hi = pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055;
    vec3 t = step(vec3(0.0031308), c);
    return mix(lo, hi, t);
}
`;

const FRAGMENT = `
vec3 color = cogl_color_out.rgb;

color = srgb_to_linear(color);

// Move the colour towards its luminance: 0 = greyscale, 1 = unchanged,
// above 1 = more saturated.
float luma = dot(color, LUMA);
color = mix(vec3(luma), color, u_saturation);

// Clamp before the gamma step so a negative channel can never reach pow().
color = clamp(color, 0.0, 1.0);
color = linear_to_srgb(color);

// Traditional display gamma (same direction as "xrandr --gamma" > 1).
color = pow(color, vec3(1.0 / max(u_gamma, 0.01)));

cogl_color_out.rgb = color;
`;

export const GammaSaturationEffect = GObject.registerClass(
class GammaSaturationEffect extends Shell.GLSLEffect {
    constructor(params = {}) {
        super(params);

        this._saturation = 1.0;
        this._gamma = 1.0;

        this._saturationUniform = this.get_uniform_location('u_saturation');
        this._gammaUniform = this.get_uniform_location('u_gamma');

        if (this._saturationUniform >= 0)
            this.set_uniform_float(this._saturationUniform, 1, [1.0]);
        if (this._gammaUniform >= 0)
            this.set_uniform_float(this._gammaUniform, 1, [1.0]);
    }

    vfunc_build_pipeline() {
        // Cogl.SnippetHook.FRAGMENT appends GLSL after Cogl has sampled the
        // redirected texture, so cogl_color_out holds the final pixel.
        this.add_glsl_snippet(Cogl.SnippetHook.FRAGMENT, DECLARATIONS, FRAGMENT, false);
    }

    setColorParams(saturation, gamma) {
        if (this._saturationUniform < 0 || this._gammaUniform < 0)
            return;

        saturation = Math.min(2.0, Math.max(0.0, saturation));
        gamma = Math.min(2.5, Math.max(0.5, gamma));

        if (saturation !== this._saturation) {
            this.set_uniform_float(this._saturationUniform, 1, [saturation]);
            this._saturation = saturation;
        }

        if (gamma !== this._gamma) {
            this.set_uniform_float(this._gammaUniform, 1, [gamma]);
            this._gamma = gamma;
        }

        this.queue_repaint();
    }

    vfunc_pre_paint(node, paintContext) {
        // Screenshot guard.
        //
        // With a full-screen offscreen effect, the shell composites the
        // desktop into an intermediate texture before it reaches the screen.
        // Screenshot and screencast code renders the desktop into a texture
        // of its own, and on GNOME 48 the two paths can interfere: a capture
        // sometimes reads the half-painted intermediate buffer and comes out
        // incomplete (usually a missing window frame).
        //
        // A capture paint uses an offscreen framebuffer. When we see one, we
        // return false, which makes Clutter paint the actor directly into the
        // capture target without running the shader.
        //
        // This covers most captures, not all of them. Pausing the effect for
        // a moment (see "Screenshots" in the README) is the reliable
        // workaround.
        let framebuffer = null;
        try {
            framebuffer = paintContext.get_framebuffer();
        } catch {
            // If introspection ever changes, fail safe and paint normally.
            return super.vfunc_pre_paint(node, paintContext);
        }

        if (framebuffer && !(framebuffer instanceof Cogl.Onscreen))
            return false;

        return super.vfunc_pre_paint(node, paintContext);
    }
});
