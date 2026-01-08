# Logo Setup for Deployment

## Required Files:

Please add these logo files to the `public` folder:

1. **FM-LOGO-Light.png** - Light/beige logo for dark backgrounds
2. **FM-LOGO-TEMP.png** - Dark logo for light backgrounds

## Location:
Place both PNG files directly in the `public` folder:
```
public/
  ├── FM-LOGO-Light.png
  ├── FM-LOGO-TEMP.png
  └── _redirects
```

## After adding logos:
Run `npm run build` again to include them in the dist folder.

The logos will be accessible at:
- `/FM-LOGO-Light.png`
- `/FM-LOGO-TEMP.png`
