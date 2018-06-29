#version 300 es
precision mediump  float;
// Ouput data
layout(location = 0) out vec4 color;

uniform sampler2D texture1;

in vec2 tex_coord;

void main()
{
	color = vec4(texture(texture1, tex_coord).rgb,1.0);
}