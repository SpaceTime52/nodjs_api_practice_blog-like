// app.js -> index.js의 Router를 통해 들어온 이파일은,
// 기본값 'api/posts'로 연결된 요청을 처리합니다.

// 이 파일에서 사용할 라우터 객체 생성
const express = require("express");
const router = express.Router();
const Sequelize = require("sequelize");

// models 폴더 안에 있는  Post DB 모델을 가져다 사용합니다.
const { Post } = require("../models");
const { User } = require("../models");

// 각 api 접근할 때마다 사용자 인증을 위한 미들웨어 임포트
const authMiddleware = require("../middlewares/auth-middleware");

//  ---------------- 여기부터 API 시작 ----------------

// ------------------
// TASK 1 : 게시글 목록 조회 with GET ('/api/posts')
router.get("/", async (req, res) => {
  // 몽고디비 데이터베이스 상의 'Post'에서 모든 데이터를 createdAt의 내림차순으로 불러온 후,
  const dataAll = await Post.findAll({
    order: [["createdAt", "DESC"]],
  });

  // data 배열에 하나씩 넣어 줍니다. (push)
  const data = [];

  for (let i = 0; i < dataAll.length; i++) {
    data.push({
      postId: dataAll[i]._id.toString(), // 이 때 ObjectId 객체로 불러와진 값은 문자열로 바꿉니다.
      userId: dataAll[i].userId,
      nickname: dataAll[i].nickname,
      title: dataAll[i].title,
      createdAt: dataAll[i].createdAt,
      updatedAt: dataAll[i].updatedAt,
      likes: dataAll[i].likes,
    });
  }

  res.json({ data: data }); // 값이 다 넣어진 배열을 Response 해줍니다.
});

// ------------------
// TASK 2 : 게시글 작성 with POST ('/api/posts')
router.post("/", authMiddleware, async (req, res) => {
  // POST 요청의 body로 받은 아이들을 각 변수 title, content에 넣어줍니다.
  // 인증된 user의 정보는 미들웨어를 통해 넘겨받았습니다.
  const { user } = await res.locals;
  const { title, content } = req.body; // 변수 4개를 한꺼번에 선언했다.

  // 그 변수들을 Post DB에 create - 생성해줍니다.
  await Post.create({
    userId: user.userId,
    nickname: user.nickname,
    title,
    content,
  });

  // 명세서대로 Response를 반환 해줍니다.
  res.json({ message: "게시글을 생성하였습니다." });
});

// ------------------
// TASK 7 : 내가 좋아한 게시글 조회 ('/api/posts/like)
router.get("/like", authMiddleware, async (req, res) => {
  // 변수 정의, 지금까지 user가 좋아한 Posts
  const { user } = await res.locals;

  console.log(user);
  const postIdsUserLiked = await User.findOne({
    where: { userId: user.userId },
  }).then((e) => e.likedPosts);

  console.log(postIdsUserLiked);

  // 좋아요 할 Post, 지금까지 user가 좋아한 Posts
  const postsUserLiked = await Post.findAll({
    where: { _id: postIdsUserLiked },
    order: [["likes", "DESC"]],
  });

  // data 배열에 하나씩 넣어 줍니다. (push)
  const data = [];

  for (let i = 0; i < postsUserLiked.length; i++) {
    data.push({
      postId: postsUserLiked[i]._id.toString(), // 이 때 ObjectId 객체로 불러와진 값은 문자열로 바꿉니다.
      userId: postsUserLiked[i].userId,
      nickname: postsUserLiked[i].nickname,
      title: postsUserLiked[i].title,
      createdAt: postsUserLiked[i].createdAt,
      updatedAt: postsUserLiked[i].updatedAt,
      likes: postsUserLiked[i].likes,
    });
  }

  res.json({ data: data }); // 값이 다 넣어진 배열을 Response 해줍니다.
});

// ------------------
// TASK 3 : 게시글 상세조회 with GET ('/api/posts/:_postId')
router.get("/:_postId", async (req, res) => {
  // URL 뒤쪽에 params{ 로 전달받은 _postId를 사용하겠다고 변수 선언합니다.
  const { _postId } = req.params;
  // 이 _postId를 id로 가진 DB 요소를 모두 찾아서 thisPost라는 변수에 넣습니다.
  const thisPost = await Post.findOne({ where: { _id: _postId } });

  // DB에서 찾아낸 thisPost의 개수가 0개이면, 없다고 response 합니다.
  if (!thisPost) {
    return res.json({ message: "해당 게시글이 없습니다." });
  }

  // 그렇지 않으면,
  const data = [
    {
      postId: thisPost._id.toString(),
      userId: thisPost.userId,
      nickname: thisPost.nickname,
      title: thisPost.title,
      content: thisPost.content,
      createdAt: thisPost.createdAt,
      updatedAt: thisPost.updatedAt,
      likes: thisPost.likes,
    },
  ];

  // 그 데이터를 Response 합니다.
  res.json({ data: data });
});

// ------------------
// TASK 4 : 게시글 수정 with PUT ('/api/posts/:_postId')
router.put("/:_postId", authMiddleware, async (req, res) => {
  // URL 뒤쪽에 params로 전달받은 _postId를 사용하겠다고 변수 선언합니다.
  const { _postId } = req.params;
  // 동시에 수정할 내용을 Request body에 담아 받게 되는데
  const { title, content } = req.body;

  // 이 _postId를 id로 가진 DB 요소를 모두 찾아서 thisPost라는 변수에 넣습니다.
  const thisPost = await Post.findOne({ where: { _id: _postId } });

  // 마찬가지로 찾아낸 게 없으면 게시글 수정을 진행할 수 없습니다.
  if (!thisPost) {
    return res.json({ message: "해당 게시글이 없습니다." });
  }

  // 찾아낸 게 있지만, 로그인 한 유저가 글 작성자가 아니면 수정을 못함
  // 미들웨어를 거쳐 인증된 사용자 객체 user (사용자 정보를 모두 담고 있음)
  const { user } = await res.locals;
  if (user.nickname != thisPost.nickname) {
    return res.json({ message: "수정 권한이 없습니다." });
  }

  // 다 만족하면 if문을 거치지 않고 여기까지 오는데, 그 Post를 update합니다.
  await Post.update(
    { title, content }, // 어떤 댓글을 수정할지 넣고,
    {
      where: {
        _id: _postId,
      },
    }
  );

  // 수정이 원활하게 진행되면 게시글을 수정하였다는 Response를 보냅니다.
  res.json({ message: "게시글을 수정하였습니다." });
});

// ------------------
// TASK 5 : 게시글 삭제 with DELETE ('/api/posts/:_postId')
router.delete("/:_postId", authMiddleware, async (req, res) => {
  // URL 뒤쪽에 params로 전달받은 _postId를 사용하겠다고 변수 선언합니다.
  const { _postId } = req.params;

  // 입력 받은 _postId와 동일한 요소를 DB에서 찾아냅니다.
  const thisPost = await Post.findOne({ where: { _id: _postId } });
  // 찾은 게 없으면 실패를 Response 하고,
  if (!thisPost) {
    return res.json({ message: "해당 게시글이 없습니다." });
  }

  // 로그인 한 유저가 글 작성자가 아니면 수정을 못함
  // 미들웨어를 거쳐 인증된 사용자 객체 user (사용자 정보를 모두 담고 있음)
  const { user } = await res.locals;
  if (user.nickname != thisPost.nickname) {
    return res.json({ message: "삭제 권한이 없습니다." });
  } else {
    await Post.destroy({
      where: {
        _id: _postId,
      },
    });
    // 여기까지 왔으면 게시글이 삭제되었으므로 삭제하게 됩니다.
    res.json({ message: "게시글을 삭제하였습니다." });
  }
});

// ---------부가기능--------------
// 게시글 작성 여러개 한꺼번에 with POST ('/api/posts/many')
// 명세서에 없는 내용이지만 한번에 여러개 게시글을 작성해놓기 위해서 만들어본 것입니다. 건너 뛰셔도 됩니다.
router.post("/many", authMiddleware, async (req, res) => {
  const { user } = await res.locals;
  for (let i = 0; i < req.body.length; i++) {
    var { title, content } = req.body[i];

    await Post.create({
      userId: user.userId,
      nickname: user.nickname,
      title,
      content,
    });
  }

  res.json({ message: "게시글을 생성하였습니다." });
});

// ------------------
// TASK 6 : 게시글 좋아요 누르기 ('/api/posts/:_postId/like)
router.put("/:_postId/like", authMiddleware, async (req, res) => {
  // 변수 정의
  const { _postId } = req.params;
  const { user } = await res.locals;

  // 좋아요 할 Post, 지금까지 user가 좋아한 Posts
  const postToLike = await Post.findOne({ where: { _id: _postId } });

  if (!postToLike) {
    return res.json({ message: "해당 게시글이 없습니다." });
  }

  // User가 지금까지 좋아했던 포스트의 List
  let postIdsUserLiked = await User.findOne({
    where: { userId: user.userId },
  }).then((e) => e.likedPosts);
  // const postIdsUserLiked = postsUserLiked.likedPosts; // user가 좋아한 Posts id

  // console.log(postIdsUserLiked);
  // console.log(Array.isArray(postIdsUserLiked));
  // console.log(postToLike._id);

  // 지금껏 좋아요 한 배열이 이번에 좋아요 누른 값을 가지고 있지 않으면 Like 하나를 올리고 리턴
  if (!postIdsUserLiked.includes(postToLike._id.toString())) {
    await Post.update(
      { likes: Sequelize.literal("likes + 1") }, // like를 하나 올림 (Sequelize문법)
      { where: { _id: _postId } }
    );

    postIdsUserLiked.push(_postId);
    const aSet = new Set(postIdsUserLiked);
    postIdsUserLiked = Array.from(aSet);
    console.log(postIdsUserLiked);

    await User.update(
      { likedPosts: postIdsUserLiked }, // user DB에 하다 더 추가
      { where: { userId: user.userId } }
    );
    res.json({ message: "게시글의 좋아요를 등록하였습니다." });

    // 좋아요 한 배열이 이번에 좋아요 누른 값을 가지고 있지 않으면, 라이크 하나 줄이고 리턴
  } else {
    await Post.update(
      { likes: Sequelize.literal("likes - 1") }, // like를 하나 줄임 (Sequelize문법)
      { where: { _id: _postId } }
    );

    let popedArr = postIdsUserLiked.filter((element) => element !== _postId);

    await User.update(
      { likedPosts: popedArr }, // 기존 좋아했던 배열에서 _postId를 빼어낸다.
      { where: { userId: user.userId } }
    );
    res.json({ message: "게시글의 좋아요를 취소하였습니다." }); // 값이 다 넣어진 배열을 Response 해줍니다.
  }
});

// 이 파일의 router 객체를 외부에 공개합니다.
module.exports = router;
