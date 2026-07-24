import { describe, expect, it } from "vitest";
import { slugify } from "../slug";

describe("slugify", () => {
  it("convierte a minúsculas y separa por guiones", () => {
    expect(slugify("Un Título Cualquiera")).toBe("un-titulo-cualquiera");
  });

  it("elimina acentos y eñes se mantienen como n simple no acentuada", () => {
    expect(slugify("Año nuevo, ¡otra vez!")).toBe("ano-nuevo-otra-vez");
  });

  it("colapsa símbolos y espacios repetidos en un único guión", () => {
    expect(slugify("hola   ---  mundo")).toBe("hola-mundo");
  });

  it("recorta guiones al principio y al final", () => {
    expect(slugify("  -Título-  ")).toBe("titulo");
  });
});
