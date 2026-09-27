export const fonts = {
  display: "Fraunces_600SemiBold",
  body: "Outfit_400Regular",
  label: "Outfit_600SemiBold",
} as const;

export const typography = {
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 36,
  },
  drinkName: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 14,
    lineHeight: 18,
  },
} as const;
