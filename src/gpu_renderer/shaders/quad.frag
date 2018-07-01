#version 300 es
precision mediump  float;
// Ouput data
layout(location = 0) out vec4 color;

uniform sampler2D texture1;

in vec2 tex_coord;

void main()
{
	vec3 c = texture(texture1, tex_coord).rgb;
	//color = vec4(c,1.0);
	color = vec4(sqrt(c.r), sqrt(c.g), sqrt(c.b), 1.0);
	//color = vec4(pow(c.r, 1.0/3.0), pow(c.g, 1.0/3.0), pow(c.b, 1.0/3.0), 1.0);
}