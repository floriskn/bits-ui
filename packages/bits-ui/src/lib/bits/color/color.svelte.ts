type RGB = [number, number, number];

// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
const SRGB_MATRIX_MUL: RGB = [0.2126729, 0.7151522, 0.072175];
// const Y: RGB = [0.2126, 0.7152, 0.0722];

function relativeLuminance(rgb: RGB): number {
	return rgb.reduce((acc: number, v: number, i: number) => {
		let res = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		return acc + res * SRGB_MATRIX_MUL[i]!;
	}, 0);
}
