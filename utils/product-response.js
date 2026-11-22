// The only product fields we ever send back to a client.
// Left out on purpose: createdBy, __v, and image.publicId (internal details).
export function toProductResponse(product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description,
    image: product.image?.src, // a plain link, or nothing at all
    category: product.category,
    company: product.company,
    colors: product.colors,
    featured: product.featured,
    freeShipping: product.freeShipping,
    inventory: product.inventory,
    averageRating: product.averageRating,
    numOfReviews: product.numOfReviews,
  };
}