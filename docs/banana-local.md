# banana-local

## How to run / develop a banana docker image locally.

1. (Fork and) clone https://github.com/bananaml/serverless-template-stable-diffusion
2. modify `Dockerfile` with your HuffingFace key as per above repo's README.
3. `docker build -t banana-sd .`
4. `docker run --gpus all -p 8000:8000 banana-sd`

Now it's running on port

You can test with

```bash
$ curl -X POST http://localhost:8000/ \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"test"}'
```

You'll get back a long `{"image_base64":"\/9j\/4AAQSkZJRgABAQAA....zUgZ\/9k="}`.
Now you can use the "fetch local" destination in the Web UI.
