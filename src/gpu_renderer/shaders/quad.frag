#version 300 es
precision mediump float;
// Ouput data
layout(location = 0) out vec4 color;

uniform sampler2D u_texture;

in vec2 tex_coord;

// Converts a color from linear light gamma to sRGB gamma
vec4 fromLinear(vec4 linearRGB)
{
    bvec4 cutoff = lessThan(linearRGB, vec4(0.0031308));
    vec4 higher = vec4(1.055)*pow(linearRGB, vec4(1.0/2.4)) - vec4(0.055);
    vec4 lower = linearRGB * vec4(12.92);

    return mix(higher, lower, cutoff);
}

// Converts a color from sRGB gamma to linear light gamma
vec4 toLinear(vec4 sRGB)
{
    bvec4 cutoff = lessThan(sRGB, vec4(0.04045));
    vec4 higher = pow((sRGB + vec4(0.055))/vec4(1.055), vec4(2.4));
    vec4 lower = sRGB/vec4(12.92);

    return mix(higher, lower, cutoff);
}

void main()
{
	vec3 c = texture(u_texture, tex_coord).rgb;
	color = fromLinear(vec4(c,1.0));
//    if (tex_coord.x < 0.25)
//        color = vec4(pow(color.r, 1./2.2),pow(color.g, 1./2.2),pow(color.b, 1./2.2),1.0);   // 2.2 Gamma
//    else if (tex_coord.x < 0.5)
//        color = fromLinear(color);        // sRGB 
//    else if (tex_coord.x < 0.75)
//        color = (sqrt(color));    // sqrt approximation         
//    else
//        color = color;                // unadjusted
}