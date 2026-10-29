import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemaTypes'
import { deskStructure } from './structure'

export default defineConfig({
  name: 'default',
  title: 'Cafe In Content Studio',
  projectId: 'kgt3bhzl',
  dataset: 'production',
  plugins: [structureTool({ structure: deskStructure })],
  schema: { types: schemaTypes },
})
