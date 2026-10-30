import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'interact-contract-'));

try {
  const outfile = join(tempDir, 'interact-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          ChangeResourceLikeApiContract,
          GetResourceUserInteractionRecordApiContract,
          RateResourceApiContract,
          RecordResourceReadApiContract,
        } from '@/domains/Interact/apis/InteractApi.contract';
        export {
          CreateCommentApiContract,
          CreateReplyApiContract,
          DeleteCommentItemApiContract,
          ListCommentsApiContract,
          ListRepliesApiContract,
          ToggleCommentLikeApiContract,
        } from '@/domains/Interact/apis/CommentApi.contract';
        export {
          ChangeFavoriteStatusApiContract,
          CreateCollectionApiContract,
          DeleteCollectionApiContract,
          GetFavoriteStatusApiContract,
          ListFavoriteCollectionsApiContract,
          ListFavoritedResourcesApiContract,
          UpdateCollectionInfoApiContract,
        } from '@/domains/Interact/apis/FavoriteApi.contract';
        export { InteractServicesMap } from '@/domains/Interact/mapper/InteractServices.map';
        export { CommentApi } from '@/domains/Interact/mock/CommentApi.mock';
        export { FavoriteApi } from '@/domains/Interact/mock/FavoriteApi.mock';
        export { InteractApi } from '@/domains/Interact/mock/InteractApi.mock';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': join(root, 'src') },
  });

  const {
    ChangeFavoriteStatusApiContract,
    ChangeResourceLikeApiContract,
    CommentApi,
    CreateCollectionApiContract,
    CreateCommentApiContract,
    CreateReplyApiContract,
    DeleteCollectionApiContract,
    DeleteCommentItemApiContract,
    FavoriteApi,
    GetFavoriteStatusApiContract,
    GetResourceUserInteractionRecordApiContract,
    InteractApi,
    InteractServicesMap,
    ListCommentsApiContract,
    ListFavoriteCollectionsApiContract,
    ListFavoritedResourcesApiContract,
    ListRepliesApiContract,
    parseApiRequest,
    parseApiResponse,
    RateResourceApiContract,
    RecordResourceReadApiContract,
    ToggleCommentLikeApiContract,
    UpdateCollectionInfoApiContract,
  } = await import(pathToFileURL(outfile).href);

  const contracts = [
    ChangeFavoriteStatusApiContract,
    ChangeResourceLikeApiContract,
    CreateCollectionApiContract,
    CreateCommentApiContract,
    CreateReplyApiContract,
    DeleteCollectionApiContract,
    DeleteCommentItemApiContract,
    GetFavoriteStatusApiContract,
    GetResourceUserInteractionRecordApiContract,
    ListCommentsApiContract,
    ListFavoriteCollectionsApiContract,
    ListFavoritedResourcesApiContract,
    ListRepliesApiContract,
    RateResourceApiContract,
    RecordResourceReadApiContract,
    ToggleCommentLikeApiContract,
    UpdateCollectionInfoApiContract,
  ];
  assert.equal(new Set(contracts.map((contract) => contract.name)).size, 17);
  assert.equal(new Set(contracts.map((contract) => contract.endpoint)).size, 17);

  assert(
    !ChangeResourceLikeApiContract.request.safeParse({
      resourceId: 'resource-1',
      liked: true,
    }).success
  );
  assert(
    !RateResourceApiContract.request.safeParse({
      resourceId: 'resource-1',
      score: 6,
    }).success
  );

  const interaction = parseApiResponse(
    GetResourceUserInteractionRecordApiContract,
    await InteractApi.getUserInteractionRecord({ resourceId: 'mock-note-1' })
  );
  assert.equal(interaction.resourceId, 'mock-note-1');
  assert.equal(interaction.read, true);

  const commentRequest = parseApiRequest(CreateCommentApiContract, {
    resourceId: 'mock-note-1',
    content: '  新评论  ',
    imageUrls: [],
  });
  assert.equal(commentRequest.content, '新评论');
  assert(
    !ListCommentsApiContract.request.safeParse({
      resourceId: 'mock-note-1',
      sortBy: 'CREATE_TIME',
      page: 1,
      size: 51,
    }).success
  );

  const rawCommentPage = await CommentApi.listComments({
    resourceId: 'mock-note-1',
    sortBy: 'CREATE_TIME',
    page: 1,
    size: 10,
  });
  const commentPage = parseApiResponse(ListCommentsApiContract, {
    ...rawCommentPage,
    total: String(rawCommentPage.total),
  });
  const mappedPage = InteractServicesMap.mapCommentPageFromApi(commentPage);
  assert.equal(mappedPage.items[0].commentId, 'mock-mock-note-1-comment-1');
  assert.equal(mappedPage.items[0].author.name, '王明');

  const favoriteStatus = parseApiResponse(
    GetFavoriteStatusApiContract,
    await FavoriteApi.getFavoriteStatus('mock-note-1')
  );
  assert.deepEqual(favoriteStatus.collectionIds, ['mock-favorite-default']);

  const collections = parseApiResponse(
    ListFavoriteCollectionsApiContract,
    await FavoriteApi.listCollections()
  );
  assert.equal(collections[0].isDefault, true);
  assert.equal(typeof collections[0].createTime, 'number');

  const rawFavorites = await FavoriteApi.listFavoritedResources({
    page: 1,
    size: 20,
  });
  const favorites = parseApiResponse(ListFavoritedResourcesApiContract, {
    ...rawFavorites,
    total: String(rawFavorites.total),
  });
  assert.equal(favorites.list[0].accessible, true);
  assert.equal(favorites.list[0].collectionIds.length > 0, true);

  assert(
    UpdateCollectionInfoApiContract.request.safeParse({
      collectionId: 'collection-1',
      collectionName: '新名称',
      description: null,
    }).success
  );

  console.log('Interact API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
