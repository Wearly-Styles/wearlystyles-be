-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "role" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT,
    "avatar" TEXT,
    "preferences" TEXT,
    "is_premium" BOOLEAN,
    "gender" TEXT,
    "birthday" TIMESTAMP(3),
    "location" TEXT,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clothing_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "name" TEXT,
    "color" TEXT,
    "image" TEXT,
    "is_default" BOOLEAN,
    "is_favorite" BOOLEAN,
    "description" TEXT,
    "season" TEXT,
    "material" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "clothing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clothing_item_tags" (
    "clothing_item_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "public"."outfits" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT,
    "occasion" TEXT,
    "weather" TEXT,
    "is_favorite" BOOLEAN,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outfit_items" (
    "outfit_id" INTEGER NOT NULL,
    "clothing_item_id" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "public"."outfit_plans" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "outfit_id" INTEGER,
    "plan_date" TIMESTAMP(3),
    "plan_type" TEXT,
    "reminder_sent" BOOLEAN,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "outfit_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outfit_histories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "outfit_id" INTEGER,
    "worn_date" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "outfit_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "image" TEXT,
    "caption" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER,
    "user_id" INTEGER,
    "content" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."likes" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER,
    "user_id" INTEGER,
    "is_active" BOOLEAN,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."follows" (
    "follower_id" INTEGER NOT NULL,
    "following_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "actor_id" INTEGER,
    "type" TEXT,
    "content" TEXT,
    "reference_id" INTEGER,
    "reference_type" TEXT,
    "is_read" BOOLEAN,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(65,30),
    "currency" TEXT,
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "status" TEXT,
    "paid_at" TIMESTAMP(3),
    "premium_start" TIMESTAMP(3),
    "premium_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "public"."user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_item_tags_clothing_item_id_tag_id_key" ON "public"."clothing_item_tags"("clothing_item_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_items_outfit_id_clothing_item_id_key" ON "public"."outfit_items"("outfit_id", "clothing_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_post_id_user_id_key" ON "public"."likes"("post_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "public"."follows"("follower_id", "following_id");

-- AddForeignKey
ALTER TABLE "public"."user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_items" ADD CONSTRAINT "clothing_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_items" ADD CONSTRAINT "clothing_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_item_tags" ADD CONSTRAINT "clothing_item_tags_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "public"."clothing_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_item_tags" ADD CONSTRAINT "clothing_item_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfits" ADD CONSTRAINT "outfits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_items" ADD CONSTRAINT "outfit_items_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_items" ADD CONSTRAINT "outfit_items_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "public"."clothing_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_plans" ADD CONSTRAINT "outfit_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_plans" ADD CONSTRAINT "outfit_plans_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_histories" ADD CONSTRAINT "outfit_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outfit_histories" ADD CONSTRAINT "outfit_histories_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
