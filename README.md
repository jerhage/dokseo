# Reader + OCR = Use Yomitan While Reading Image-Based material

Upload your manga, book, webtoon, etc. (supports pdf, zip, cbz or folder full of images).

As you read, select the area you wish to OCR.

Results appear in a side panel as pure text.

Use Yomitan to look up definitions, sentence mine, etc.

Captured text persists for every document.

# Self-Hosting

If you want to self-host, it's as simple as cloning, installing the dependencies (`npm install`) and running the application (npm run build && npm run preview). I am using deno to try it out, but node works just as well.

# Contributing

If you want to contribute, you should fork and put up a PR. There is an internal dev-only `/docs` route that explains a lot of the architechure and functionality of the app. It has diagrams and interactive demoes to aid people new to any of the concepts. One cool thing about the docs is their code examples are protected against drift using tests. If something changes in the application code and the docs aren't updated or vice-versa, CI will fail. Check it out!

I am open to ideas and contributions, but I'm also a stickler for maintaining the application architechure and coding standards. If you have questions on the code, I'm always happy to discuss.

## License

[MIT](LICENSE) © 2026 Jeremy Hage
