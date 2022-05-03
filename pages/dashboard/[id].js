import Head from 'next/head';
import Layout from '../../components/layout';
import Link from 'next/link';
import Navbar from '../../components/navbar';
import { PrismaClient } from '@prisma/client';
import DashTabs from '../../components/dashtabs';
import { getSession } from 'next-auth/react';

const prisma = new PrismaClient();

export async function getServerSideProps(context) {
  /* First we ask the database which superblocks we need to get the data from.
     The URL of the page looks like /dashboard/<CLASSROOM_ID> where CLASSROOM ID corresponds with classroomId in our database
     Each classroom object in our database has an array fccCertifications where each number in that array corresponds to an index in the availableSuperBlocks.json file
  */
  const userSession = await getSession(context);
  console.log(userSession);
  if (!userSession) {
    context.res.writeHead(302, { Location: '/' });
    context.res.end();
    return {};
  }
  const userInfo = await prisma.User.findMany({
    where: {
      email: userSession['user']['email']
    }
  });
  const classroomTeacherId = await prisma.classroom.findUnique({
    where: {
      classroomId: context.params.id
    },
    select: {
      classroomTeacherId: true
    }
  });
  console.log(classroomTeacherId);
  if (userInfo[0].id !== classroomTeacherId['classroomTeacherId']) {
    context.res.writeHead(302, { Location: '/classes' });
    context.res.end();
    return {};
  }

  const certificationNumbers = await prisma.classroom.findUnique({
    where: {
      classroomId: context.params.id
    },
    select: {
      fccCertifications: true
    }
  });

  //base URL of freecodecamp's API
  const base_url = 'https://www.freecodecamp.org/mobile/';

  //url of alll the superblocks
  const superblocksres = await fetch(
    'https://www.freecodecamp.org/mobile/availableSuperblocks.json'
  );
  const superblocksreq = await superblocksres.json();

  //1 in the certification numbers will correspond with the first superblock name we get from freecodeCamp for example
  //we add the name that we get from the availableSuperBlocks to the base url to get the url that will give us the data from a specific superblock

  let urls = certificationNumbers['fccCertifications'].map(
    x => base_url + superblocksreq['superblocks'][0][x] + '.json'
  );
  let names = certificationNumbers['fccCertifications'].map(
    x => superblocksreq['superblocks'][1][x]
  );

  // let jsonResponses = [];

  // let jsonResponses = urls.MapAwait(async i => {
  //   let myUrl = await fetch(i)
  //   let myJSON = myUrl.json()
  //   myJSON.then(function(result){
  //     console.log(result);
  //     return result
  //   })
  // })

  let jsonResponses = await Promise.all(
    urls.map(async i => {
      let myUrl = await fetch(i);
      let myJSON = myUrl.json();
      return myJSON;
    })
  );

  let blocks = jsonResponses.map(x => {
    return x;
  });

  // TODO: Convert this nested loop into a pure function (functional programming)
  // let sortedBlocks = [];
  // for (let i = 0; i < blocks.length; i++) {
  //   var currSort = [];
  //   console.log(blocks[i])
  //   for (let challenge of Object.keys(blocks[i])) {
  //     // This names our columns using human readable module names, and gives it a selector of the same name, but in dashed format.
  //     currSort.push([
  //       {
  //         name: blocks[i][challenge]['challenges']['name'],
  //         selector: challenge
  //       },
  //       blocks[i][challenge]['challenges']['order']
  //     ]);
  //   }
  //   // Sorts our columns based on the order that it holds in our block
  //   currSort.sort(function (a, b) {
  //     if (a[1] === b[1]) {
  //       return 0;
  //     } else {
  //       return a[1] < b[1] ? -1 : 1;
  //     }
  //   });

  let sortedBlocks = blocks.map(block => {
    let currBlock = Object.keys(block).map(nestedBlock => {
      let classCertification = Object.entries(block[nestedBlock]['blocks']).map(
        ([x]) => {
          return [
            {
              name: block[nestedBlock]['blocks'][x]['challenges']['name'],
              //  Warning: title is a string based column selector which has been deprecated as of v7 and will be removed in v8 #1016
              selector: x
            },
            block[nestedBlock]['blocks'][x]['challenges']['order']
          ];
        }
      );
      classCertification.sort(function (a, b) {
        if (a[1] === b[1]) {
          return 0;
        } else {
          return a[1] < b[1] ? -1 : 1;
        }
      });
      //this gets us the first column of our 2d array
      const arrayColumn = (arr, n) => arr.map(x => x[n]);
      classCertification = arrayColumn(classCertification, 0);
      return classCertification;
    });
    return currBlock;
  });
  //1 refers to the second element in our list
  //https://lage.us/Javascript-Sort-2d-Array-by-Column.html
  return {
    props: { userSession, columns: sortedBlocks, certificationNames: names }
  };
}

export default function Home({ userSession, columns, certificationNames }) {
  let tabNames = certificationNames;
  let columnNames = columns;
  return (
    <Layout>
      <Head>
        <title>Create Next App</title>
        <meta name='description' content='Generated by create next app' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      {userSession && (
        <>
          <Navbar>
            <div className='border-solid border-2 pl-4 pr-4'>
              <Link href={'/classes'}>Classes</Link>
            </div>
            <div className='border-solid border-2 pl-4 pr-4'>
              <Link href={'/'}> Menu</Link>
            </div>
            <div className='hover:bg-[#ffbf00] shadedow-lg border-solid border-color: inherit; border-2 pl-4 pr-4 bg-[#f1be32] text-black'>
              <Link href={'/'}>Sign out</Link>
            </div>
          </Navbar>
          <DashTabs
            columns={columnNames}
            certificationNames={tabNames}
          ></DashTabs>
        </>
      )}
    </Layout>
  );
}
