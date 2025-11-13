const updateBlogCover = async () => {
  try {
    // First, let's get the current post to confirm its ID
    const getResponse = await fetch('http://localhost:3000/api/posts?id=one-young-world-partners-with-top100', {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch post: ${getResponse.status}`);
    }
    
    const postData = await getResponse.json();
    console.log('Current post data:', postData);
    
    // Now update the post with the new cover image
    const updateResponse = await fetch('http://localhost:3000/api/posts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'one-young-world-partners-with-top100',
        title: postData.title,
        slug: postData.slug,
        content: postData.contentHtml, // contentHtml is what's stored in the DB
        cover_image: '/blog/Top100 Africa Future Leaders patners with one young world.png',
        is_featured: postData.isFeatured,
        status: postData.status,
        tags: postData.tags,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      throw new Error(`Failed to update post: ${updateResponse.status} - ${errorData.message || 'Unknown error'}`);
    }

    const updatedPost = await updateResponse.json();
    console.log('Updated post:', updatedPost);
    console.log('Successfully updated the blog post with the new cover image!');
    
  } catch (error) {
    console.error('Error updating blog post:', error);
  }
};

updateBlogCover();