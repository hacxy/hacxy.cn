type Post = {
  frontMatter: {
    date: string
    title: string
    category: string
    tags: string[]
    description: string
  }
  regularPath: string
}

export function initTags(post: any[]) {
  const data: any = {}
  for (let index = 0; index < post?.length; index++) {
    const element = post[index]
    const tags = element.tags
    if (tags) {
      tags.forEach((item: any) => {
        if (data[item]) {
          data[item].push(element)
        } else {
          data[item] = []
          data[item].push(element)
        }
      })
    }
  }
  return data
}

export function initCategory(post: Post[]) {
  const data: any = {}
  for (let index = 0; index < post?.length; index++) {
    const element = post[index]
    const category = element.frontMatter.category
    if (category) {
      if (data[category]) {
        data[category].push(element)
      } else {
        data[category] = []
        data[category].push(element)
      }
    }
  }
  return data
}

export function useYearSort(post: any[]) {
  const data = []
  let year = '0'
  let num = -1
  for (let index = 0; index < post?.length; index++) {
    const element = post[index]
    if (element.date) {
      const y = element.date.split('-')[0]
      if (y === year) {
        data[num].push(element)
      } else {
        num++
        data[num] = [] as any
        data[num].push(element)
        year = y
      }
    }
  }
  return data
}
