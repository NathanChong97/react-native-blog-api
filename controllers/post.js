const Post = require("../models/post");
const FeaturedPost = require("../models/featuredPost");
const cloudinary = require("../cloud");
const post = require("../models/post");
const { isValidObjectId } = require("mongoose");

const FEATURED_POST_COUNT = 4;
const addToFeaturePost = async (postId) => {
  const isAlreadyExist = await FeaturedPost.findOne({ post: postId });

  if (isAlreadyExist) return;

  const featuredPost = new FeaturedPost({ post: postId });
  await featuredPost.save();

  //remove previous data limit to only 4 featured post
  const featuredPosts = await FeaturedPost.find({}).sort({ createdAt: -1 });
  featuredPosts.forEach(async (post, index) => {
    if (index >= FEATURED_POST_COUNT)
      await FeaturedPost.findByIdAndDelete(post._id);
  });
};

const removeFromFeaturePost = async (postId) => {
  await FeaturedPost.findOneAndDelete({ post: postId });
};

const isFeaturedPost = async (postId) => {
  const post = await FeaturedPost.findOne({ post: postId });

  return post ? true : false;
};

exports.createPost = async (req, res) => {
  const { title, meta, content, slug, author, tags, featured } = req.body;
  const { file } = req;
  const isAlreadyExist = await Post.findOne({ slug });

  if (isAlreadyExist)
    return res.status(401).json({ error: "Please use unique slug" });
  const newPost = new Post({ title, meta, content, slug, author, tags });

  if (file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      file.path
    );

    newPost.thumbnail = { url: secure_url, public_id };
  }

  await newPost.save();

  if (featured) await addToFeaturePost(newPost._id);

  res.json({
    post: {
      id: newPost._id,
      title,
      meta,
      slug,
      thumbnail: newPost.thumbnail.url,
      author: newPost.author,
    },
  });
};

exports.deletePost = async (req, res) => {
  const { postId } = req.params;
  if (!isValidObjectId(postId)) {
    return res.status(401).json({ error: "Invalid request!" });
  }

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: "Post not found!" });

  const public_id = post.thumbnail?.public_id;
  if (public_id) {
    const { result, error } = await cloudinary.uploader.destroy(public_id);

    if (result !== "ok") {
      return res.status(404).json({ error: "Could not remove thumbnail" });
    }
  }

  await Post.findByIdAndDelete(postId);
  await removeFromFeaturePost(postId);
  res.json({ message: "Post removed successfully" });
};

exports.updatePost = async (req, res) => {
  const { title, meta, content, slug, author, tags, featured } = req.body;
  const { file } = req;
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    return res.status(401).json({ error: "Invalid request!" });
  }

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: "Post not found!" });

  //delete record with thumbnail
  const public_id = post.thumbnail?.public_id;
  if (public_id && file) {
    const { result, error } = await cloudinary.uploader.destroy(public_id);

    if (result !== "ok") {
      return res.status(401).json({ error: "Could not remove thumbnail" });
    }
  }

  //delete record that does not have thumbnail
  if (file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      file.path
    );

    post.thumbnail = { url: secure_url, public_id };
  }

  post.title = title;
  post.meta = meta;
  post.content = content;
  post.slug = slug;
  post.author = author;
  post.tags = tags;

  if (featured) {
    await addToFeaturePost(post._id);
  } else {
    await removeFromFeaturePost(post._id);
  }

  await post.save();

  //return whole json as response
  res.json({
    post: {
      id: post._id,
      title,
      meta,
      slug,
      thumbnail: post.thumbnail.url,
      author: post.author,
      content,
      featured,
      tags,
    },
  });
};

exports.getPost = async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(401).json({ error: "Invalid request!" });
  }

  const post = await Post.findOne({ slug });
  if (!post) return res.status(404).json({ error: "Post not found!" });

  const featured = await isFeaturedPost(post._id);

  const { title, meta, content, author, tags, createdAt } = post;

  res.json({
    post: {
      id: post._id,
      title,
      meta,
      slug,
      thumbnail: post.thumbnail.url,
      author,
      content,
      tags,
      featured,
      createdAt,
    },
  });
};

exports.getFeaturedPosts = async (req, res) => {
  //sort post in descending order
  const featuredPosts = await FeaturedPost.find({})
    .sort({ createdAt: -1 })
    .limit(4)
    .populate("post"); //the object name in featurePost.js

  res.json({
    posts: featuredPosts.map(({ post }) => ({
      id: post._id,
      title: post.title,
      meta: post.meta,
      slug: post.slug,
      thumbnail: post.thumbnail?.url,
      author: post.author,
    })),
  });
};

exports.getPosts = async (req, res) => {
  const { pageNo = 0, limit = 10 } = req.query;
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .skip(parseInt(pageNo) * parseInt(limit))
    .limit(parseInt(limit));

  const postCount = await Post.countDocuments();

  res.json({
    posts: posts.map((post) => ({
      id: post._id,
      title: post.title,
      meta: post.meta,
      slug: post.slug,
      thumbnail: post.thumbnail?.url,
      author: post.author,
      createdAt: post.createdAt,
      tags: post.tags,
    })),
    postCount,
  });
};

exports.searchPost = async (req, res) => {
  const { title } = req.query;

  if (!title.trim())
    return res.status(401).json({ error: "search query is missing!" });

  const posts = await Post.find({ title: { $regex: title, $options: "i" } });

  res.json({
    posts: posts.map((post) => ({
      id: post._id,
      title: post.title,
      meta: post.meta,
      slug: post.slug,
      thumbnail: post.thumbnail?.url,
      author: post.author,
      createdAt: post.createdAt,
      tags: post.tags,
    })),
  });
};

exports.getRelatedPost = async (req, res) => {
  const { postId } = req.params;
  if (!isValidObjectId(postId))
    return res.status(401).json({ error: "Invalid request!" });

  const post = await Post.findById(postId);
  if (!postId) return res.status(404).json({ error: "Post not found!" });

  const relatedPost = await Post.find({
    tags: { $in: [...post.tags] },
    _id: { $ne: post._id }, // not equal to post._id, to not have the original post as a related post
  })
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    posts: relatedPost.map((post) => ({
      id: post._id,
      title: post.title,
      meta: post.meta,
      slug: post.slug,
      thumbnail: post.thumbnail?.url,
      author: post.author,
    })),
  });
};

exports.uploadImage = async (req, res) => {
  const { file } = req;

  if (!file) return res.status(401).json({ error: "Image file is missing!" });
  const { secure_url, public_id } = await cloudinary.uploader.upload(file.path);

  res.status(201).json({ image: secure_url });
};
