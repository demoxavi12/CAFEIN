declare module 'virtual:cafe-in-gallery-assets' {
  export interface NumberedGalleryAsset {
    number: number
    filename: string
    src: string
    width: number
    height: number
  }

  export const numberedGalleryAssets: NumberedGalleryAsset[]
}
