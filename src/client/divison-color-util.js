const BACKGROUND_RGB = [207, 231, 245];
const WINNER_RGB = [255, 204, 0];
const WINNER_10PERCENT = [255, 250, 225];
const PROMO_RGB = [69, 153, 0];
const PROMO_20PERCENT = [167, 230, 178];
const RELEGATE_RGB = [255, 51, 51];
const RELEGATE_20PERCENT = [255, 195, 195];

/** Convert a color array to a CSS string */
function formatRgbString(rgbArray) {
  return `rgb(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]}`;
}

/** Apply a custom function to adjust the curve of the gradient */
function getAdjustedRatio(percentChance) {
  const intermediateRatio = percentChance / 100;
  return Math.pow(intermediateRatio, 0.9);
}

/** Gets the color at a specified location in a two-color gradient */
function getGradientColor(startColorRGB, endColorRGB, ratio) {
  const adjustedRatio = ratio;
  const delta = endColorRGB.map((item, index) => item - startColorRGB[index]);
  return startColorRGB.map(
    (item, index) => item + adjustedRatio * delta[index]
  );
}

/** Gets the color at a specific location in a three-color gradient */
function getTricolorGradientColor(
  startColorRGB,
  middleColorRGB,
  middlePercentile,
  endColorRGB,
  ratio
) {
  if (ratio <= middlePercentile) {
    const ratioInFirstGradient = ratio / middlePercentile;
    return getGradientColor(
      startColorRGB,
      middleColorRGB,
      ratioInFirstGradient
    );
  } else {
    const ratioInSecondGradient =
      (ratio - middlePercentile) / (1 - middlePercentile);
    return getGradientColor(middleColorRGB, endColorRGB, ratioInSecondGradient);
  }
}

/** Gets the color for a player's "win chance" cell based on their percent chance of winning */
export function getWinGradientColor(percentChance) {
  return formatRgbString(
    getTricolorGradientColor(
      BACKGROUND_RGB,
      WINNER_10PERCENT,
      0.1,
      WINNER_RGB,
      getAdjustedRatio(percentChance)
    )
  );
}

/** Gets the color for a player's "promo chance" cell based on their percent chance of promotion */
export function getPromoGradientColor(percentChance) {
  return formatRgbString(
    getTricolorGradientColor(
      BACKGROUND_RGB,
      PROMO_20PERCENT,
      0.2,
      PROMO_RGB,
      getAdjustedRatio(percentChance)
    )
  );
}

/** Gets the color for a player's "relegation chance" cell based on their chance of demoting */
export function getRelegationGradientColor(percentChance) {
  return formatRgbString(
    getTricolorGradientColor(
      BACKGROUND_RGB,
      RELEGATE_20PERCENT,
      0.2,
      RELEGATE_RGB,
      getAdjustedRatio(percentChance)
    )
  );
}

export const SOFT_PROMO_COLOR_STR = getPromoGradientColor(50);
export const SOFT_RELEGATE_COLOR_STR = getRelegationGradientColor(50);
export const WINNER_COLOR_STR = formatRgbString(WINNER_RGB);
export const PROMO_COLOR_STR = formatRgbString(PROMO_RGB);
export const RELEGATE_COLOR_STR = formatRgbString(RELEGATE_RGB);
export const BACKGROUND_COLOR_STR = formatRgbString(BACKGROUND_RGB);
